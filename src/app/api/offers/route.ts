import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { PAGE_SIZE } from "@/lib/catalog";
import { query, count } from "@/lib/server/db";
import { decorateOffers, OMIT_FOR_QUERY } from "@/lib/server/offers";
import { detectGeo } from "@/lib/server/geo";
import { hiddenCategoryKeys } from "@/lib/server/categories";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds the Totalum filter shared by the records query and the count query. */
function buildOfferFilter(params: URLSearchParams, hidden: string[]) {
  const q = (params.get("q") || "").trim();
  const categories = (params.get("categories") || "").split(",").filter(Boolean);
  const geos = (params.get("geos") || "").split(",").filter(Boolean);
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const subs = (params.get("sub") || "").split(",").filter(Boolean);

  // Only published showcases are public; drafts, reviews and the archive never leave the admin.
  const filter: Record<string, any> = { status: "active" };

  if (ids.length) filter._id = { in: ids };
  const allowed = categories.filter((c) => !hidden.includes(c));
  if (categories.length) filter.category = { in: allowed.length ? allowed : ["__none__"] };
  else if (hidden.length) filter.category = { nin: hidden };
  if (geos.length) {
    // Worldwide services are available everywhere, so they always stay in the result set.
    filter.geo = { in: Array.from(new Set([...geos, "worldwide"])) };
  }
  if (subs.length) filter.subfilters = { in: subs };
  if (q) {
    const regex = { regex: escapeRegex(q), options: "i" };
    filter._or = [{ name: regex }, { short_name: regex }, { tags: regex }, { description: regex }];
  }

  return filter;
}

function buildSort(sort: string) {
  switch (sort) {
    case "newest":
      return { launch_date: "desc" as const, createdAt: "desc" as const };
    case "name":
      return { name: "asc" as const };
    case "popular":
      return { click_count: "desc" as const, quality_score: "desc" as const };
    default:
      return { is_featured: "desc" as const, quality_score: "desc" as const, name: "asc" as const };
  }
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const geo = detectGeo(await headers());
    const hidden = await hiddenCategoryKeys(geo);
    const filter = buildOfferFilter(params, hidden);
    const sort = buildSort(params.get("sort") || "relevance");
    const offset = Math.max(0, Number(params.get("offset") || 0));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || PAGE_SIZE)));
    const lang = params.get("lang") || "ru";

    console.log("[API /offers] filter:", JSON.stringify(filter), "geo:", geo || "-", "lang:", lang, "offset:", offset);

    const [rows, total] = await Promise.all([
      query("offer", { _filter: filter, _sort: sort, _limit: limit, _offset: offset, _omit: OMIT_FOR_QUERY }),
      count("offer", filter),
    ]);

    // Strips every private field, applies cached translations and click badges.
    const items = await decorateOffers(rows, lang);

    console.log(`[API /offers] returned ${items.length} of ${total} services`);

    return NextResponse.json({
      ok: true,
      data: { items, total, offset, limit, hasMore: offset + items.length < total, geo },
    });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/offers", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
