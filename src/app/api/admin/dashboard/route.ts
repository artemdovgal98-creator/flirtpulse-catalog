import { NextResponse } from "next/server";
import { getAdminGuard, forbidden } from "@/lib/admin";
import { query, queryAll } from "@/lib/server/db";
import { getCategoryRows } from "@/lib/server/categories";
import { refId } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Bucket {
  key: string;
  label: string;
  clicks: number;
  unique: number;
  conversions: number;
  approved: number;
  revenue: number;
  pending_revenue: number;
  epc: number;
  cr: number;
}

function emptyBucket(key: string, label: string): Bucket {
  return { key, label, clicks: 0, unique: 0, conversions: 0, approved: 0, revenue: 0, pending_revenue: 0, epc: 0, cr: 0 };
}

function finish(b: Bucket): Bucket {
  b.revenue = Math.round(b.revenue * 100) / 100;
  b.pending_revenue = Math.round(b.pending_revenue * 100) / 100;
  b.epc = b.clicks ? Math.round((b.revenue / b.clicks) * 10000) / 10000 : 0;
  b.cr = b.clicks ? Math.round((b.approved / b.clicks) * 10000) / 100 : 0;
  return b;
}

function parseDay(value: string | null, fallback: Date): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

/**
 * Affiliate dashboard, computed entirely on the server.
 * Query: from, to (YYYY-MM-DD, inclusive, UTC), network (affiliate_network id | "direct"),
 * category (key), geo (ISO code). Defaults to the last 30 days.
 * Clicks recorded before the tracking upgrade have no category/network of their own,
 * so those are taken from the showcase they belong to.
 */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const params = new URL(request.url).searchParams;
    const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const to = parseDay(params.get("to"), today);
    const from = parseDay(params.get("from"), new Date(to.getTime() - 29 * 86400_000));
    if (from > to) return NextResponse.json({ ok: false, error: "from must be before to" }, { status: 400 });
    if (to.getTime() - from.getTime() > 366 * 86400_000) {
      return NextResponse.json({ ok: false, error: "Range is limited to one year" }, { status: 400 });
    }
    const fromIso = from.toISOString();
    const toIso = new Date(to.getTime() + 86400_000 - 1).toISOString();

    const fNetwork = (params.get("network") || "").trim();
    const fCategory = (params.get("category") || "").trim();
    const fGeo = (params.get("geo") || "").trim().toUpperCase();

    const [clicks, conversions, offers, networks, categoryRows] = await Promise.all([
      queryAll<any>(
        "click",
        {
          _filter: { clicked_at: { gte: fromIso, lte: toIso } },
          _select: { clicked_at: true, is_unique: true, geo: true, category: true, affiliate_network: true, offer: true },
        },
        100000
      ),
      queryAll<any>(
        "conversion",
        {
          _filter: { received_at: { gte: fromIso, lte: toIso } },
          _select: {
            received_at: true, status: true, payout: true, currency: true, geo: true,
            category: true, affiliate_network: true, offer: true,
          },
        },
        50000
      ),
      queryAll<any>("offer", { _select: { name: true, category: true, affiliate_network: true } }, 5000),
      query<any>("affiliate_network", { _select: { name: true, slug: true }, _limit: 500 }),
      getCategoryRows(),
    ]);

    const offerMap = new Map<string, any>(offers.map((o) => [o._id, o]));
    const netName = new Map<string, string>(networks.map((n) => [n._id, n.name || n.slug || n._id]));
    const catLabel = new Map<string, string>(categoryRows.map((c) => [c.key, c.label || c.key]));

    const resolve = (row: any) => {
      const offer = offerMap.get(refId(row.offer));
      const network = refId(row.affiliate_network) || refId(offer?.affiliate_network) || "direct";
      const category = row.category || (offer?.category || [])[0] || "—";
      const geo = String(row.geo || "").toUpperCase() || "—";
      return { offerId: refId(row.offer), offerName: offer?.name || "—", network, category, geo };
    };
    const keep = (r: ReturnType<typeof resolve>) =>
      (!fNetwork || r.network === fNetwork) && (!fCategory || r.category === fCategory) && (!fGeo || r.geo === fGeo);

    const total = emptyBucket("total", "Total");
    const byNetwork = new Map<string, Bucket>();
    const byCategory = new Map<string, Bucket>();
    const byGeo = new Map<string, Bucket>();
    const byOffer = new Map<string, Bucket>();
    const byDay = new Map<string, Bucket & { day: string }>();
    const conversionStatus = { pending: 0, approved: 0, rejected: 0, pending_pricing: 0 } as Record<string, number>;
    const currencies = new Map<string, number>();
    const geoOptions = new Set<string>();

    // Pre-fill every day so the series has no gaps.
    for (let t = from.getTime(); t <= to.getTime(); t += 86400_000) {
      const day = new Date(t).toISOString().slice(0, 10);
      byDay.set(day, { ...emptyBucket(day, day), day });
    }

    const bucketsFor = (r: ReturnType<typeof resolve>, day: string) => {
      const pick = (m: Map<string, Bucket>, key: string, label: string) => {
        let b = m.get(key);
        if (!b) {
          b = emptyBucket(key, label);
          m.set(key, b);
        }
        return b;
      };
      const list: Bucket[] = [
        total,
        pick(byNetwork, r.network, r.network === "direct" ? "Direct" : netName.get(r.network) || r.network),
        pick(byCategory, r.category, catLabel.get(r.category) || r.category),
        pick(byGeo, r.geo, r.geo),
      ];
      if (r.offerId) list.push(pick(byOffer, r.offerId, r.offerName));
      const d = byDay.get(day);
      if (d) list.push(d);
      return list;
    };

    for (const c of clicks) {
      const r = resolve(c);
      if (r.geo !== "—") geoOptions.add(r.geo);
      if (!keep(r)) continue;
      const day = String(c.clicked_at || "").slice(0, 10);
      const unique = c.is_unique === "yes";
      for (const b of bucketsFor(r, day)) {
        b.clicks += 1;
        if (unique) b.unique += 1;
      }
    }

    for (const cv of conversions) {
      const r = resolve(cv);
      if (r.geo !== "—") geoOptions.add(r.geo);
      if (!keep(r)) continue;
      const status = String(cv.status || "pending");
      const payout = Number(cv.payout) || 0;
      conversionStatus[status] = (conversionStatus[status] || 0) + 1;
      if (cv.currency) currencies.set(cv.currency, (currencies.get(cv.currency) || 0) + 1);
      const day = String(cv.received_at || "").slice(0, 10);
      for (const b of bucketsFor(r, day)) {
        b.conversions += 1;
        if (status === "approved") {
          b.approved += 1;
          b.revenue += payout;
        } else if (status === "pending" || status === "pending_pricing") {
          b.pending_revenue += payout;
        }
      }
    }

    const sortSlices = (m: Map<string, Bucket>) =>
      [...m.values()].map(finish).sort((a, b) => b.revenue - a.revenue || b.clicks - a.clicks);

    const currency = [...currencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";

    const data = {
      range: { from: fromIso.slice(0, 10), to: toIso.slice(0, 10) },
      currency,
      totals: { ...finish(total), conversionsByStatus: conversionStatus },
      byNetwork: sortSlices(byNetwork),
      byCategory: sortSlices(byCategory),
      byGeo: sortSlices(byGeo).slice(0, 30),
      topOffers: sortSlices(byOffer).slice(0, 10),
      series: [...byDay.values()].map((b) => ({ ...finish(b), day: b.day })),
      options: {
        networks: [{ _id: "direct", name: "Direct" }, ...networks.map((n) => ({ _id: n._id, name: n.name || n.slug }))],
        categories: categoryRows.map((c) => ({ key: c.key, label: c.label || c.key, emoji: c.emoji || "" })),
        geos: [...geoOptions].sort(),
      },
      generatedAt: new Date().toISOString(),
    };

    console.log(
      `[API /admin/dashboard] ${data.range.from}..${data.range.to} net=${fNetwork || "-"} cat=${fCategory || "-"} geo=${fGeo || "-"} clicks=${total.clicks} conv=${total.conversions} revenue=${total.revenue}`
    );
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/dashboard", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
