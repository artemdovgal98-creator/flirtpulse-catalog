import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard } from "@/lib/admin";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Reads the `_count` value out of a Totalum aggregate response. */
function readCount(payload: any, fallback = 0): number {
  return (
    payload?._aggregate?._count ??
    payload?._count ??
    (Array.isArray(payload) ? payload[0]?._aggregate?._count ?? payload.length : undefined) ??
    fallback
  );
}

async function countRecords(table: string, filter?: Record<string, any>): Promise<number> {
  const result = await totalumSdk.crud.query(table, {
    ...(filter ? { _filter: filter } : {}),
    _aggregate: { _count: true },
  } as any);
  if (result.errors) console.error(`[API /admin/stats] count(${table}) errors:`, result.errors);
  return readCount(result.data);
}

/** Real-time dashboard metrics. Admins only. */
export async function GET() {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const onlineSince = new Date(now - ONLINE_WINDOW_MS).toISOString();
    // UTC day boundary so "today" matches the histogram buckets below, which are
    // built from the ISO date prefix.
    const startOfToday = `${new Date(now).toISOString().slice(0, 10)}T00:00:00.000Z`;
    const weekAgo = new Date(now - 7 * 86400000).toISOString();

    const [
      totalUsers,
      newUsers,
      totalClicks,
      clicksToday,
      clicksWeek,
      showcases,
      customShowcases,
      onlineNow,
      topResult,
      recentResult,
      weekClicksResult,
    ] = await Promise.all([
      countRecords("user"),
      countRecords("user", { createdAt: { gte: weekAgo } }),
      countRecords("click"),
      countRecords("click", { clicked_at: { gte: startOfToday } }),
      countRecords("click", { clicked_at: { gte: weekAgo } }),
      countRecords("offer", { status: "active" }),
      countRecords("offer", { is_custom: "yes" }),
      countRecords("visitor_session", { last_seen_at: { gte: onlineSince } }),
      totalumSdk.crud.query("offer", {
        _filter: { status: "active", click_count: { gte: 1 } },
        _sort: { click_count: "desc" },
        _limit: 8,
        _select: { name: true, click_count: true, category: true, image_url: true },
      } as any),
      totalumSdk.crud.query("click", {
        _sort: { clicked_at: "desc" },
        _limit: 12,
        offer: true,
      } as any),
      totalumSdk.crud.query("click", {
        _filter: { clicked_at: { gte: weekAgo } },
        _sort: { clicked_at: "asc" },
        _limit: 5000,
        _select: { clicked_at: true },
      } as any),
    ]);

    if (topResult.errors) console.error("[API /admin/stats] top errors:", topResult.errors);
    if (recentResult.errors) console.error("[API /admin/stats] recent errors:", recentResult.errors);

    // Build a 7-day click histogram for the sparkline.
    const buckets: Array<{ day: string; clicks: number }> = [];
    const byDay = new Map<string, number>();
    for (const row of ((weekClicksResult.data as any[]) || [])) {
      const day = String(row.clicked_at || "").slice(0, 10);
      if (day) byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
      buckets.push({ day, clicks: byDay.get(day) || 0 });
    }

    const recent = ((recentResult.data as any[]) || []).map((c) => ({
      _id: c._id,
      clicked_at: c.clicked_at,
      language: c.language,
      offer_name: c.offer?.name ?? "—",
      visitor_id: c.visitor_id,
    }));

    const data = {
      totalUsers,
      newUsers,
      totalClicks,
      clicksToday,
      clicksWeek,
      showcases,
      customShowcases,
      onlineNow,
      top: (topResult.data as any[]) || [],
      recent,
      history: buckets,
      generatedAt: new Date().toISOString(),
    };

    console.log(
      `[API /admin/stats] users=${totalUsers} clicks=${totalClicks} online=${onlineNow} showcases=${showcases}`
    );

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/stats", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
