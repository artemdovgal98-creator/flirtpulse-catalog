import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { LANGUAGE_COUNT } from "@/lib/languages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Public counters for the home page.
 *
 * Everything is computed from the live `offer` table on every request — no
 * hard-coded or cached numbers — so the hero tiles always match the catalog.
 */
export async function GET() {
  try {
    const result = await totalumSdk.crud.query("offer", {
      _filter: { status: "active" },
      _select: { geo: true, category: true },
      _limit: 5000,
    } as any);

    if (result.errors) {
      console.error("[API /stats] sdk errors:", result.errors);
      throw new Error(JSON.stringify(result.errors));
    }

    const rows = (result.data as any[]) || [];
    const geos = new Set<string>();
    const categories = new Set<string>();

    for (const row of rows) {
      for (const g of row.geo ?? []) if (g) geos.add(String(g));
      for (const c of row.category ?? []) if (c) categories.add(String(c));
    }

    const data = {
      services: rows.length,
      // "worldwide" is a coverage flag, not a country — it must not inflate the count.
      geos: Array.from(geos).filter((g) => g !== "worldwide").length,
      categories: categories.size,
      languages: LANGUAGE_COUNT,
      generatedAt: new Date().toISOString(),
    };

    console.log(
      `[API /stats] services=${data.services} geos=${data.geos} categories=${data.categories} languages=${data.languages}`
    );

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/stats", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
