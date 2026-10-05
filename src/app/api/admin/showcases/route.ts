import { NextResponse, after } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { normaliseShowcase, type ShowcasePayload } from "@/lib/showcase";
import { slugify } from "@/data/offers";
import { queryAll, create, getById, update } from "@/lib/server/db";
import { getCategoryRows } from "@/lib/server/categories";
import { retranslateOffer } from "@/lib/server/offers";
import { announceShowcase } from "@/lib/server/announce";
import {
  EMPTY_STATS,
  checkAndStore,
  failedHardChecks,
  getOfferStatsMap,
  requestOrigin,
} from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SORTS = ["newest", "updated", "name", "clicks", "cr", "revenue"] as const;

/**
 * Lists showcases with their hidden tracking links and performance (admins only).
 * Filters: q, status (all = everything except archived | draft | review | active |
 * paused | archived), category, network (affiliate_network id | "none"), featured=1.
 * Sort: newest | updated | name | clicks | cr | revenue — stats are computed on the
 * server from the click + conversion tables, so sorting works across all pages.
 */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim();
    const status = (params.get("status") || "all").trim();
    const category = (params.get("category") || "").trim();
    const network = (params.get("network") || "").trim();
    const featured = params.get("featured") === "1";
    const sortParam = (params.get("sort") || "newest") as (typeof SORTS)[number];
    const sort = SORTS.includes(sortParam) ? sortParam : "newest";
    const offset = Math.max(0, Number(params.get("offset") || 0));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 30)));

    const filter: Record<string, any> = {};
    if (status === "all") filter.status = { ne: "archived" };
    else filter.status = status;
    if (category) filter.category = { in: [category] };
    if (featured) filter.is_featured = "yes";
    if (network === "none") filter.affiliate_network = null;
    else if (/^[a-f0-9]{24}$/i.test(network)) filter.affiliate_network = network;
    if (q) {
      const regex = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };
      filter._or = [{ name: regex }, { short_name: regex }, { tags: regex }, { offer_url: regex }];
    }

    const sortSpec: Record<string, "asc" | "desc"> =
      sort === "name" ? { name: "asc" } : sort === "updated" ? { updatedAt: "desc" } : { createdAt: "desc" };

    // The catalog is a few hundred rows: reading the filtered set once lets us
    // sort by computed metrics and still paginate correctly.
    const [rows, stats] = await Promise.all([
      queryAll<any>("offer", { _filter: filter, _sort: sortSpec }, 5000),
      getOfferStatsMap(),
    ]);

    const withStats = rows.map((r) => ({ ...r, stats: stats.get(r._id) ?? EMPTY_STATS }));
    if (sort === "clicks") withStats.sort((a, b) => b.stats.clicks - a.stats.clicks);
    if (sort === "cr") withStats.sort((a, b) => b.stats.cr - a.stats.cr || b.stats.clicks - a.stats.clicks);
    if (sort === "revenue") withStats.sort((a, b) => b.stats.revenue - a.stats.revenue || b.stats.clicks - a.stats.clicks);

    const total = withStats.length;
    const items = withStats.slice(offset, offset + limit);

    console.log(
      `[API /admin/showcases] ${items.length}/${total} (status=${status} cat=${category || "-"} net=${network || "-"} sort=${sort} q="${q}")`
    );

    return NextResponse.json({
      ok: true,
      data: { items, total, offset, limit, hasMore: offset + items.length < total },
    });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/showcases", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Creates a showcase. Publishing directly is allowed only when the hard checks pass. */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const body = (await request.json()) as ShowcasePayload;
    const categoryKeys = (await getCategoryRows()).map((c) => c.key).filter(Boolean);
    const normalised = normaliseShowcase(body, categoryKeys);
    if ("error" in normalised) {
      return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    }
    const wantsPublish = normalised.value.status === "active";

    const record: Record<string, any> = {
      ...normalised.value,
      // Created as a draft first — it is only published once the checks pass.
      status: wantsPublish ? "draft" : normalised.value.status,
      slug: slugify(`${normalised.value.name}-custom-${Date.now()}`),
      network: "Custom",
      quality_score: 95,
      click_count: 0,
      is_custom: "yes",
      admin_edited: "yes",
      launch_date: new Date().toISOString(),
    };
    if (record.affiliate_network) {
      const net = await getById<any>("affiliate_network", record.affiliate_network);
      if (net?.name) record.network = net.name;
    } else {
      delete record.affiliate_network;
    }
    for (const k of ["payout_model", "access_model"]) if (record[k] == null) delete record[k];

    const newId = await create("offer", record);
    let item = (await getById<any>("offer", newId)) ?? { _id: newId, ...record };

    const check = await checkAndStore(item);
    let blocked = false;
    if (wantsPublish) {
      if (check.ok) {
        await update("offer", newId, { status: "active", published_at: new Date().toISOString() });
        item = (await getById<any>("offer", newId)) ?? item;
        const origin = requestOrigin(request);
        const snapshot = item;
        after(() =>
          announceShowcase(snapshot, origin).catch((err) => console.error("[admin] announce failed:", err))
        );
      } else {
        blocked = true;
      }
    }
    retranslateOffer(item);

    await logAdmin(guard, "create", "offer", newId, `Created showcase "${item.name}" (${item.status})`, {
      blocked,
      failed: failedHardChecks(check),
    });
    console.log(`[API /admin/showcases] created "${item.name}" -> ${newId} status=${item.status} blocked=${blocked}`);

    return NextResponse.json({ ok: true, data: { item: { ...item, check_result: check }, check, blocked } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

