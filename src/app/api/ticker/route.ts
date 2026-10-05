import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";
import { pickTranslation } from "@/lib/server/translate";

export const dynamic = "force-dynamic";

function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

/** Public running line: enabled items inside their date window, localised with fallback to the original. */
export async function GET(request: Request) {
  try {
    const lang = (new URL(request.url).searchParams.get("lang") || "ru").slice(0, 5);
    const rows = await query<any>("ticker_item", {
      _filter: { is_enabled: "yes" },
      _sort: { createdAt: "desc" },
      _limit: 100,
    });
    const now = Date.now();
    const items = rows
      .filter((r) => {
        if (r.starts_at && new Date(r.starts_at).getTime() > now) return false;
        if (r.ends_at && new Date(r.ends_at).getTime() < now) return false;
        return Boolean(r.text);
      })
      .slice(0, 30)
      .map((r) => {
        const offerId = refId(r.offer);
        return {
          _id: r._id,
          kind: r.kind || "news",
          text: pickTranslation(r.text, r.translations, lang),
          link: r.link || (offerId ? `/offer/${offerId}` : ""),
        };
      });
    console.log(`[API /ticker] ${items.length} live items of ${rows.length} enabled (lang=${lang})`);
    return NextResponse.json({ ok: true, data: { items } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/ticker", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
