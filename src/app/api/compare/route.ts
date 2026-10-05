import { NextResponse } from "next/server";
import { decorateOffers } from "@/lib/server/offers";
import { cleanIds, loadOffersByIds, reviewCounts, safeLang } from "@/components/engage/server";

export const dynamic = "force-dynamic";

/** Side-by-side data for up to 3 showcases. Body: { ids, lang } */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { ids?: unknown; lang?: string };
    const ids = cleanIds(body.ids, 3);
    const lang = safeLang(body.lang);
    if (!ids.length) return NextResponse.json({ ok: true, data: { items: [] } });

    const rows = await loadOffersByIds(ids);
    const [items, counts] = await Promise.all([decorateOffers(rows, lang), reviewCounts(rows.map((r) => String(r._id)))]);
    const data = items.map((o) => {
      const c = counts.get(String(o._id)) ?? { up: 0, down: 0 };
      const total = c.up + c.down;
      return { ...o, rating: { up: c.up, down: c.down, percent: total ? Math.round((c.up / total) * 100) : null } };
    });
    console.log(`[API /compare] ${data.length}/${ids.length} showcases compared`);
    return NextResponse.json({ ok: true, data: { items: data } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/compare", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
