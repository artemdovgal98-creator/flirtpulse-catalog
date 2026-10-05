import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { detectGeo } from "@/lib/server/geo";

export const dynamic = "force-dynamic";

/** Visitor country (lowercase ISO code, "" when unknown). */
export async function GET() {
  try {
    const geo = detectGeo(await headers());
    console.log(`[API /geo] detected "${geo || "-"}"`);
    return NextResponse.json({ ok: true, data: { geo } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/geo", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
