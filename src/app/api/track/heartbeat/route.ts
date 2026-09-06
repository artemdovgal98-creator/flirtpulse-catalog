import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";

export const dynamic = "force-dynamic";

/**
 * Presence heartbeat. The client pings this every 30s with a stable visitor id,
 * and the admin dashboard counts sessions seen in the last 5 minutes as "online".
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { visitorId?: string; path?: string; language?: string };
    const visitorId = (body.visitorId || "").trim();

    if (!visitorId) {
      return NextResponse.json({ ok: false, error: "visitorId is required" }, { status: 400 });
    }

    const hdrs = await headers();
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: hdrs });
      userId = session?.user?.id ?? null;
    } catch (err) {
      console.error("[heartbeat] session lookup failed (continuing as guest):", err);
    }

    const now = new Date().toISOString();
    const existingResult = await totalumSdk.crud.query("visitor_session", {
      _filter: { visitor_id: visitorId },
      _limit: 1,
    } as any);
    if (existingResult.errors) console.error("[heartbeat] lookup errors:", existingResult.errors);

    const existing = ((existingResult.data as any[]) || [])[0];

    const payload: Record<string, any> = {
      visitor_id: visitorId,
      last_seen_at: now,
      path: (body.path || "/").slice(0, 200),
      language: (body.language || "").slice(0, 8),
      user_agent: (hdrs.get("user-agent") || "").slice(0, 250),
    };
    if (userId) payload.user = userId;

    if (existing) {
      payload.page_views = (Number(existing.page_views) || 0) + 1;
      const updated = await totalumSdk.crud.editRecordById("visitor_session", existing._id, payload as any);
      if (updated.errors) console.error("[heartbeat] update errors:", updated.errors);
    } else {
      payload.first_seen_at = now;
      payload.page_views = 1;
      const created = await totalumSdk.crud.createRecord("visitor_session", payload as any);
      if (created.errors) console.error("[heartbeat] create errors:", created.errors);
      console.log(`[heartbeat] new visitor session ${visitorId}`);
    }

    return NextResponse.json({ ok: true, data: { visitorId, at: now } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/track/heartbeat", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
