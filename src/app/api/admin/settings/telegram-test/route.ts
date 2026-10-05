import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { sendTelegram } from "@/lib/server/telegram";

export const dynamic = "force-dynamic";

/** Sends a test message to the configured Telegram channel/chat. */
export async function POST() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const res = await sendTelegram(`✅ <b>FlirtPulse</b>: Telegram test message (${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC)`);
    await logAdmin(guard, "telegram_test", "app_setting", "telegram", res.ok ? "Telegram test sent" : `Telegram test failed: ${res.error}`);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error || "Telegram error" }, { status: 502 });
    return NextResponse.json({ ok: true, data: { sent: true } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/settings/telegram-test", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
