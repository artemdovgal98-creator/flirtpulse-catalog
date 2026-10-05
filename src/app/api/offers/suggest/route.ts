import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { query } from "@/lib/server/db";
import { buildGoPath, getNetworkSlugs } from "@/lib/server/offers";
import { detectGeo } from "@/lib/server/geo";
import { hiddenCategoryKeys } from "@/lib/server/categories";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function coverOf(row: any): string {
  const imgs = Array.isArray(row.images) ? row.images : row.images ? [row.images] : [];
  return imgs.find((f: any) => f?.url)?.url || row.image_url || "";
}

/** Search-as-you-type: up to 8 published showcases (public fields only). */
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim().slice(0, 80);
    if (q.length < 2) return NextResponse.json({ ok: true, data: { items: [] } });

    const geo = detectGeo(await headers());
    const hidden = await hiddenCategoryKeys(geo);
    const regex = { regex: escapeRegex(q), options: "i" };
    const filter: Record<string, any> = {
      status: "active",
      _or: [{ name: regex }, { short_name: regex }, { tags: regex }],
    };
    if (hidden.length) filter.category = { nin: hidden };

    const [rows, networks] = await Promise.all([
      query<any>("offer", {
        _filter: filter,
        _select: { name: true, short_name: true, category: true, images: true, image_url: true, affiliate_network: true, is_featured: true },
        _sort: { is_featured: "desc", click_count: "desc", name: "asc" },
        _limit: 8,
      }),
      getNetworkSlugs().catch((err) => {
        console.error("[API /offers/suggest] network slugs unavailable:", err);
        return new Map<string, string>();
      }),
    ]);

    const items = rows.map((r) => ({
      _id: r._id,
      name: r.name,
      short_name: r.short_name || "",
      category: r.category || [],
      image: coverOf(r),
      go_path: buildGoPath(r, networks),
    }));
    console.log(`[API /offers/suggest] "${q}" → ${items.length}`);
    return NextResponse.json({ ok: true, data: { items } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/offers/suggest", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
