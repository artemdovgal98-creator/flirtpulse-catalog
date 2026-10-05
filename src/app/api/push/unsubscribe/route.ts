import { NextResponse } from "next/server";
import { query, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Deactivates the push subscription with this endpoint. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    const endpoint = String(body.endpoint || "").trim();
    if (!endpoint) return NextResponse.json({ ok: false, error: "endpoint is required" }, { status: 400 });
    const rows = await query<any>("push_subscription", { _filter: { endpoint }, _limit: 5 });
    for (const r of rows) await update("push_subscription", r._id, { is_active: "no" });
    console.log(`[API /push/unsubscribe] deactivated ${rows.length} subscription(s)`);
    return NextResponse.json({ ok: true, data: { updated: rows.length } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/push/unsubscribe", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
