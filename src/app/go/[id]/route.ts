import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

/**
 * Hidden tracking redirect.
 *
 * Visitors only ever see `/go/{id}` — the real destination lives in the
 * `offer.offer_url` column and never reaches the browser. Every hit is recorded
 * in the `click` table and increments the item's counter before redirecting.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const result = await totalumSdk.crud.getRecordById("offer", id);
    const offer = result.data as any;

    if (!offer) {
      console.error(`[GO] showcase ${id} not found`);
      return NextResponse.redirect(new URL("/catalog", request.url), 302);
    }

    const destination: string | undefined = offer.offer_url;
    if (!destination) {
      console.error(`[GO] showcase ${id} ("${offer.name}") has no destination configured`);
      return NextResponse.redirect(new URL("/catalog", request.url), 302);
    }

    const hdrs = await headers();
    const url = new URL(request.url);
    const visitorId = url.searchParams.get("v") || "anonymous";

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: hdrs });
      userId = session?.user?.id ?? null;
    } catch (err) {
      console.error("[GO] session lookup failed (continuing as guest):", err);
    }

    const clickRecord: Record<string, any> = {
      offer: id,
      visitor_id: visitorId,
      clicked_at: new Date().toISOString(),
      ip_address:
        hdrs.get("cf-connecting-ip") || hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
      user_agent: (hdrs.get("user-agent") || "").slice(0, 250),
      referrer: (hdrs.get("referer") || "").slice(0, 250),
      language: url.searchParams.get("lang") || "",
    };
    if (userId) clickRecord.user = userId;

    // Analytics must never block the redirect, but failures still have to be visible.
    await Promise.all([
      totalumSdk.crud
        .createRecord("click", clickRecord as any)
        .then((r) => {
          if (r.errors) console.error("[GO] click record errors:", r.errors);
        })
        .catch((err) => console.error("[GO] could not store click:", err)),
      totalumSdk.crud
        .editRecordById("offer", id, { click_count: (Number(offer.click_count) || 0) + 1 } as any)
        .then((r) => {
          if (r.errors) console.error("[GO] counter update errors:", r.errors);
        })
        .catch((err) => console.error("[GO] could not increment counter:", err)),
    ]);

    console.log(`[GO] ${offer.name} -> click #${(Number(offer.click_count) || 0) + 1} (user=${userId ?? "guest"})`);

    return NextResponse.redirect(destination, 302);
  } catch (err: any) {
    console.error("[API ERROR] GET /go/[id]", err);
    return NextResponse.redirect(new URL("/catalog", request.url), 302);
  }
}
