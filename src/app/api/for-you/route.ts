import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query } from "@/lib/server/db";
import { detectGeo } from "@/lib/server/geo";
import { decorateOffers, getBadgeMap, type BadgeInfo } from "@/lib/server/offers";
import {
  getSessionUser,
  getVisibleOffers,
  loadOffersByIds,
  availableIn,
  cleanIds,
  refId,
  safeLang,
} from "@/components/engage/server";

export const dynamic = "force-dynamic";

const LIMIT = 10;

/**
 * "For you" — personal picks.
 * Body: { favoriteIds, viewedCategories: {cat: views}, recentIds, lang }.
 * Signed-in users also get their stored favourites mixed in.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      favoriteIds?: string[];
      viewedCategories?: Record<string, number>;
      recentIds?: string[];
      lang?: string;
    };
    const lang = safeLang(body.lang);
    const geo = detectGeo(await headers());
    const user = await getSessionUser();

    const favoriteIds = new Set(cleanIds(body.favoriteIds, 300));
    if (user) {
      const favs = await query<any>("favorite", { _filter: { user: user.id }, _limit: 500 });
      for (const f of favs) {
        const id = refId(f.offer);
        if (id) favoriteIds.add(id);
      }
    }
    const recentIds = new Set(cleanIds(body.recentIds, 50));

    const [offers, badges] = await Promise.all([
      getVisibleOffers(geo),
      getBadgeMap().catch((err) => {
        console.error("[API /for-you] badges unavailable:", err);
        return new Map<string, BadgeInfo>();
      }),
    ]);
    const byId = new Map(offers.map((o) => [String(o._id), o]));

    // Category interest weights: favourites count 3×, a view counts 1×.
    const weights: Record<string, number> = {};
    for (const id of favoriteIds) {
      for (const c of byId.get(id)?.category ?? []) weights[c] = (weights[c] || 0) + 3;
    }
    for (const [c, n] of Object.entries(body.viewedCategories || {})) {
      const v = Math.max(0, Math.min(1000, Number(n) || 0));
      if (v) weights[c] = (weights[c] || 0) + v;
    }
    for (const id of recentIds) {
      for (const c of byId.get(id)?.category ?? []) weights[c] = (weights[c] || 0) + 1;
    }
    const maxWeight = Math.max(0, ...Object.values(weights));
    const personal = maxWeight > 0;

    const scored = offers
      .filter((o) => !favoriteIds.has(String(o._id)) && !recentIds.has(String(o._id)))
      .filter((o) => availableIn(o, geo) !== "no")
      .map((o) => {
        const info = badges.get(String(o._id));
        const popularity =
          Math.log2(1 + (info?.clicks7d ?? 0)) * 3 + Math.log2(1 + Number(o.click_count || 0)) * 1.5;
        let interest = 0;
        if (personal) {
          for (const c of o.category ?? []) interest = Math.max(interest, (weights[c] || 0) / maxWeight);
        }
        const score =
          interest * 40 +
          popularity +
          (o.is_featured === "yes" ? 3 : 0) +
          (info?.badges.length ? 2 : 0) +
          Number(o.quality_score || 0) / 50;
        return { id: String(o._id), score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT);

    const rows = await loadOffersByIds(scored.map((s) => s.id));
    const items = await decorateOffers(rows, lang);
    console.log(
      `[API /for-you] ${personal ? "personal" : "popular fallback"} — ${items.length} picks (favs ${favoriteIds.size}, recent ${recentIds.size}, geo ${geo || "-"})`
    );
    return NextResponse.json({ ok: true, data: { items, personal } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/for-you", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
