import { NextResponse } from "next/server";
import { query, parseJson, csv } from "@/lib/server/db";
import { pickTranslation } from "@/lib/server/translate";

export const dynamic = "force-dynamic";

function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

/**
 * Public notification feed (bell + service worker push).
 * `cats` = csv of the visitor's subscribed categories: general notifications
 * (no category) are always included plus the matching ones. Without `cats`
 * every notification is returned.
 */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const lang = (params.get("lang") || "ru").slice(0, 5);
    const cats = csv(params.get("cats"));
    const limit = Math.min(30, Math.max(1, Number(params.get("limit") || 30)));
    const now = Date.now();

    const rows = await query<any>("notification", {
      _filter: { is_enabled: "yes" },
      _sort: { published_at: "desc", createdAt: "desc" },
      _limit: 200,
    });

    const items = rows
      .map((r) => ({ ...r, _when: r.published_at || r.createdAt }))
      .filter((r) => r._when && new Date(r._when).getTime() <= now)
      .filter((r) => {
        if (!cats.length) return true;
        const c = String(r.category || "").trim().toLowerCase();
        return !c || cats.includes(c);
      })
      .sort((a, b) => new Date(b._when).getTime() - new Date(a._when).getTime())
      .slice(0, limit)
      .map((r) => {
        const tr = parseJson<{ title?: Record<string, string>; body?: Record<string, string> }>(r.translations, {});
        const offerId = refId(r.offer);
        return {
          _id: r._id,
          type: r.type || "news",
          category: r.category || "",
          title: pickTranslation(r.title || "", tr.title, lang),
          body: pickTranslation(r.body || "", tr.body, lang),
          link: r.link || (offerId ? `/offer/${offerId}` : ""),
          published_at: r._when,
        };
      });

    console.log(`[API /notifications] ${items.length} items (lang=${lang}, cats=${cats.join("|") || "all"})`);
    return NextResponse.json({ ok: true, data: { items } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/notifications", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
