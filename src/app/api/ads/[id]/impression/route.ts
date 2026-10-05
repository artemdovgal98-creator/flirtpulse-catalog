import { NextResponse } from "next/server";
import { getById, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Counts one ad impression (server-side counter on `ad_tag.impressions`). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const ad = await getById<any>("ad_tag", id);
    if (!ad) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const next = (Number(ad.impressions) || 0) + 1;
    await update("ad_tag", id, { impressions: next });
    console.log(`[API /ads/impression] ad ${id} → impressions=${next}`);
    return NextResponse.json({ ok: true, data: { impressions: next } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/ads/[id]/impression", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
