import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { detectGeo } from "@/lib/server/geo";
import { getPublicOffer } from "@/app/offer/[id]/offer-data";

export const dynamic = "force-dynamic";

/** One published showcase — public fields only, localised, with badges and go_path. 404 when not active. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const lang = (new URL(request.url).searchParams.get("lang") || "ru").slice(0, 5);
    const geo = detectGeo(await headers());
    const offer = await getPublicOffer(id, lang, geo);
    if (!offer) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    console.log(`[API /offers/${id}] served (lang=${lang})`);
    return NextResponse.json({ ok: true, data: { offer } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/offers/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
