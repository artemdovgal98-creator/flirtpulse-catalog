import { NextResponse } from "next/server";
import { query, update } from "@/lib/server/db";
import { decorateOffers, OMIT_FOR_QUERY } from "@/lib/server/offers";
import { safeLang } from "@/components/engage/server";

export const dynamic = "force-dynamic";

/** Public view of a shared collection: title + published showcases only. Nothing about the author. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const sp = new URL(request.url).searchParams;
    const lang = safeLang(sp.get("lang"));
    const countView = sp.get("count") !== "0";
    if (!/^[a-f0-9]{6,64}$/i.test(token || "")) {
      return NextResponse.json({ ok: false, error: "Collection not found" }, { status: 404 });
    }

    const rows = await query<any>("shared_collection", {
      _filter: { token },
      _limit: 1,
      offers: { _filter: { status: "active" }, _omit: OMIT_FOR_QUERY, _limit: 100 },
    });
    const col = rows[0];
    if (!col) return NextResponse.json({ ok: false, error: "Collection not found" }, { status: 404 });

    const offers = Array.isArray(col.offers) ? col.offers : [];
    const items = await decorateOffers(offers, lang);
    const views = Number(col.views || 0) + (countView ? 1 : 0);
    if (countView) {
      // Awaited: background promises can be cut off once the response is sent.
      await update("shared_collection", col._id, { views }).catch((err) =>
        console.error(`[API /collections/${token}] could not count the view:`, err)
      );
    }

    console.log(`[API /collections/${token}] ${items.length} showcases, view #${views}`);
    return NextResponse.json({
      ok: true,
      data: { title: col.title || "", list: col.list || "all", views, items, createdAt: col.createdAt },
    });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/collections/[token]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
