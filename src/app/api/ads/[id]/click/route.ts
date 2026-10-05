import { NextResponse } from "next/server";
import { getById, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Counts one ad click (server-side counter on `ad_tag.clicks`). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const ad = await getById<any>("ad_tag", id);
    if (!ad) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const next = (Number(ad.clicks) || 0) + 1;
    await update("ad_tag", id, { clicks: next });
    console.log(`[API /ads/click] ad ${id} → clicks=${next}`);
    return NextResponse.json({ ok: true, data: { clicks: next } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/ads/[id]/click", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
