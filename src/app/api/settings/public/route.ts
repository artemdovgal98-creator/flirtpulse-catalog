import { NextResponse } from "next/server";
import { getSettings, PUBLIC_SETTINGS } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

/** Only the whitelisted public settings — secrets never leave the server. */
export async function GET() {
  try {
    const all = await getSettings();
    const data: Record<string, string> = {};
    for (const key of PUBLIC_SETTINGS) data[key] = all[key] ?? "";
    // Only http(s) channel links are exposed.
    if (data.telegram_channel_url && !/^https?:\/\//i.test(data.telegram_channel_url)) {
      data.telegram_channel_url = data.telegram_channel_url.startsWith("@")
        ? `https://t.me/${data.telegram_channel_url.slice(1)}`
        : "";
    }
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/settings/public", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
