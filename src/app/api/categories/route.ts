import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { visibleCategories } from "@/lib/server/categories";
import { detectGeo } from "@/lib/server/geo";

export const dynamic = "force-dynamic";

/**
 * Public category list for the visitor's GEO (Sex Shop only for UA, etc.)
 * plus the detected country, which the client uses for the automatic GEO filter.
 */
export async function GET() {
  try {
    const geo = detectGeo(await headers());
    const categories = await visibleCategories(geo);
    console.log(`[API /categories] geo=${geo || "-"} → ${categories.length} categories`);
    return NextResponse.json({ ok: true, data: { categories, geo } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/categories", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
