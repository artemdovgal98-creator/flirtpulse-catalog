import { NextResponse } from "next/server";
import { getUiStrings } from "@/lib/server/ui-i18n";

export const dynamic = "force-dynamic";

/** Interface strings for a language; missing ones are translated in the background. */
export async function GET(req: Request, { params }: { params: Promise<{ lang: string }> }) {
  try {
    const { lang } = await params;
    const wait = new URL(req.url).searchParams.get("wait") === "1";
    const data = await getUiStrings(lang, wait);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/i18n", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
