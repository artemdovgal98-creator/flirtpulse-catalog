import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { canManage, managerOnly } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 20;

async function runBatched<T>(items: T[], task: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += BATCH) {
    await Promise.all(items.slice(i, i + BATCH).map(task));
  }
}

/**
 * Zeroes every counter: deletes the recorded clicks and the presence sessions,
 * and resets `click_count` on every showcase. Admins only, and irreversible —
 * the UI asks for a confirmation before calling it.
 */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();
    const body = (await request.json().catch(() => ({}))) as { confirm?: string };
    // Second confirmation typed by the admin in the Settings panel.
    if (String(body.confirm || "").trim().toUpperCase() !== "СБРОСИТЬ") {
      return NextResponse.json({ ok: false, error: "CONFIRMATION_REQUIRED" }, { status: 400 });
    }

    const [clicksResult, sessionsResult, offersResult] = await Promise.all([
      totalumSdk.crud.query("click", { _select: { _id: true }, _limit: 5000 } as any),
      totalumSdk.crud.query("visitor_session", { _select: { _id: true }, _limit: 5000 } as any),
      totalumSdk.crud.query("offer", {
        _filter: { click_count: { gte: 1 } },
        _select: { _id: true },
        _limit: 5000,
      } as any),
    ]);

    for (const [label, result] of [
      ["click", clicksResult],
      ["visitor_session", sessionsResult],
      ["offer", offersResult],
    ] as const) {
      if (result.errors) {
        console.error(`[API /admin/stats/reset] ${label} read errors:`, result.errors);
        throw new Error(JSON.stringify(result.errors));
      }
    }

    const clicks = (clicksResult.data as any[]) || [];
    const sessions = (sessionsResult.data as any[]) || [];
    const offers = (offersResult.data as any[]) || [];

    const failures: string[] = [];

    await runBatched(clicks, async (row) => {
      const res = await totalumSdk.crud.deleteRecordById("click", row._id);
      if (res.errors) {
        console.error("[API /admin/stats/reset] click delete errors:", res.errors);
        failures.push(`click:${row._id}`);
      }
    });

    await runBatched(sessions, async (row) => {
      const res = await totalumSdk.crud.deleteRecordById("visitor_session", row._id);
      if (res.errors) {
        console.error("[API /admin/stats/reset] session delete errors:", res.errors);
        failures.push(`session:${row._id}`);
      }
    });

    await runBatched(offers, async (row) => {
      const res = await totalumSdk.crud.editRecordById("offer", row._id, { click_count: 0 } as any);
      if (res.errors) {
        console.error("[API /admin/stats/reset] offer reset errors:", res.errors);
        failures.push(`offer:${row._id}`);
      }
    });

    if (failures.length) {
      throw new Error(`${failures.length} record(s) could not be reset: ${failures.slice(0, 5).join(", ")}`);
    }

    console.log(
      `[API /admin/stats/reset] cleared ${clicks.length} clicks, ${sessions.length} sessions, ${offers.length} counters`
    );

    await logAdmin(guard, "stats_reset", "click", "all", `Statistics reset: ${clicks.length} clicks, ${sessions.length} sessions, ${offers.length} counters`);

    return NextResponse.json({
      ok: true,
      data: { clicks: clicks.length, sessions: sessions.length, offers: offers.length },
    });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/stats/reset", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
