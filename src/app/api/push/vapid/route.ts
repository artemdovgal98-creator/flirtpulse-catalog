import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/server/webpush";

export const dynamic = "force-dynamic";

/** Public VAPID key (applicationServerKey) for PushManager.subscribe. */
export async function GET() {
  try {
    const { publicKey } = await getVapidKeys();
    console.log("[API /push/vapid] served public key");
    return NextResponse.json({ ok: true, data: { publicKey } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/push/vapid", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
