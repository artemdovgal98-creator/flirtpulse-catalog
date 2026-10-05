import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getById, query, create, update, randomToken } from "@/lib/server/db";
import { detectGeo } from "@/lib/server/geo";
import { buildDestination } from "@/lib/server/tracking";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "fp_sid";
const SESSION_TTL = 30 * 60; // seconds — a visit ends after 30 idle minutes

/**
 * Tracking redirect: /go/{category}/{network}/{showcase}  (legacy: /go/{showcase}).
 *
 * The server creates a click_id, records the click (session, GEO, SubID, time,
 * uniqueness) and only then redirects — and only to the hidden link of a
 * registered, published showcase. Nothing in the URL can choose the destination.
 */
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const parts = (path || []).map((p) => decodeURIComponent(p));
  const offerId = parts[parts.length - 1] || "";
  const pathCategory = parts.length >= 3 ? parts[0] : "";
  const pathNetwork = parts.length >= 3 ? parts[1] : "";
  const fallback = NextResponse.redirect(new URL("/catalog", request.url), 302);

  try {
    if (!/^[a-f0-9]{24}$/i.test(offerId)) {
      console.error(`[GO] rejected malformed showcase id "${offerId}"`);
      return fallback;
    }

    const offer = await getById<any>("offer", offerId);
    if (!offer || offer.status !== "active" || !offer.offer_url) {
      console.error(`[GO] ${offerId} is not a published showcase with a link (status=${offer?.status ?? "missing"})`);
      return fallback;
    }

    const hdrs = await headers();
    const cookieStore = await cookies();
    const url = new URL(request.url);
    const visitorId = (url.searchParams.get("v") || "anonymous").slice(0, 64);
    const subid = (url.searchParams.get("sub") || url.searchParams.get("subid") || "").replace(/[^\w.-]/g, "").slice(0, 64);
    const lang = (url.searchParams.get("lang") || "").slice(0, 5);
    const geo = detectGeo(hdrs);
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value || `s_${randomToken(8)}`;
    const clickId = randomToken(12);
    const category = (offer.category || [])[0] || pathCategory || "";

    let network: any = null;
    const networkId = typeof offer.affiliate_network === "string" ? offer.affiliate_network : offer.affiliate_network?._id;
    if (networkId) network = await getById<any>("affiliate_network", networkId);
    if (pathNetwork && network?.slug && pathNetwork !== network.slug) {
      console.warn(`[GO] path network "${pathNetwork}" differs from registered "${network.slug}" — using the registered one`);
    }

    const destination = buildDestination(offer.offer_url, offer.subid_template || network?.link_template || "", {
      click_id: clickId,
      subid,
      category,
      geo,
      offer_id: offerId,
      network: network?.slug || "direct",
      lang,
    });
    if (!destination) {
      console.error(`[GO] ${offerId} produced an invalid destination — refusing to redirect`);
      return fallback;
    }

    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: hdrs });
      userId = session?.user?.id ?? null;
    } catch (err) {
      console.error("[GO] session lookup failed (continuing as guest):", err);
    }

    // Unique = first click of this visitor on this showcase in the last 24 hours.
    const since = new Date(Date.now() - 86400_000).toISOString();
    const previous = await query("click", {
      _filter: { offer: offerId, visitor_id: visitorId, clicked_at: { gte: since } },
      _select: { _id: true },
      _limit: 1,
    }).catch((err) => {
      console.error("[GO] uniqueness lookup failed:", err);
      return [];
    });

    const clickRecord: Record<string, any> = {
      offer: offerId,
      click_id: clickId,
      visitor_id: visitorId,
      session_id: sessionId,
      clicked_at: new Date().toISOString(),
      geo,
      subid,
      category,
      is_unique: previous.length ? "no" : "yes",
      ip_address: hdrs.get("cf-connecting-ip") || hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
      user_agent: (hdrs.get("user-agent") || "").slice(0, 250),
      referrer: (hdrs.get("referer") || "").slice(0, 250),
      language: lang,
    };
    if (userId) clickRecord.user = userId;
    if (networkId) clickRecord.affiliate_network = networkId;

    // The click must exist before the visitor leaves: the postback looks it up by click_id.
    await Promise.all([
      create("click", clickRecord).catch((err) => console.error("[GO] could not store click:", err)),
      update("offer", offerId, { click_count: (Number(offer.click_count) || 0) + 1 }).catch((err) =>
        console.error("[GO] could not increment counter:", err)
      ),
    ]);

    console.log(
      `[GO] ${offer.name} click_id=${clickId} geo=${geo || "-"} sub=${subid || "-"} unique=${clickRecord.is_unique} user=${userId ?? "guest"}`
    );

    const response = NextResponse.redirect(destination, 302);
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: SESSION_TTL,
      path: "/",
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch (err: any) {
    console.error("[API ERROR] GET /go/[...path]", err);
    return fallback;
  }
}
