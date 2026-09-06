import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { PAGE_SIZE, PRIVATE_OFFER_FIELDS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fields the public catalog must never expose. Totalum strips them server-side,
 * so partner networks and tracking destinations physically cannot reach the browser.
 */
const OMIT_PRIVATE = Object.fromEntries(PRIVATE_OFFER_FIELDS.map((f) => [f, true]));

/** Builds the Totalum filter shared by the records query and the count query. */
function buildOfferFilter(params: URLSearchParams) {
  const q = (params.get("q") || "").trim();
  const categories = (params.get("categories") || "").split(",").filter(Boolean);
  const geos = (params.get("geos") || "").split(",").filter(Boolean);
  const ids = (params.get("ids") || "").split(",").filter(Boolean);

  const filter: Record<string, any> = { status: "active" };

  if (ids.length) filter._id = { in: ids };
  if (categories.length) filter.category = { in: categories };
  if (geos.length) {
    // Worldwide services are available everywhere, so they always stay in the result set.
    filter.geo = { in: Array.from(new Set([...geos, "worldwide"])) };
  }
  if (q) {
    const regex = { regex: escapeRegex(q), options: "i" };
    filter._or = [{ name: regex }, { tags: regex }, { description: regex }];
  }

  return filter;
}

function buildSort(sort: string) {
  switch (sort) {
    case "newest":
      return { launch_date: "desc" as const };
    case "name":
      return { name: "asc" as const };
    case "popular":
      return { click_count: "desc" as const, quality_score: "desc" as const };
    default:
      return { quality_score: "desc" as const, name: "asc" as const };
  }
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const filter = buildOfferFilter(params);
    const sort = buildSort(params.get("sort") || "relevance");
    const offset = Math.max(0, Number(params.get("offset") || 0));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || PAGE_SIZE)));

    console.log("[API /offers] filter:", JSON.stringify(filter), "sort:", sort, "offset:", offset);

    const [recordsResult, countResult] = await Promise.all([
      totalumSdk.crud.query("offer", {
        _filter: filter,
        _sort: sort,
        _limit: limit,
        _offset: offset,
        _omit: OMIT_PRIVATE,
      } as any),
      totalumSdk.crud.query("offer", {
        _filter: filter,
        _aggregate: { _count: true },
      } as any),
    ]);

    if (recordsResult.errors) console.error("[API /offers] sdk errors:", recordsResult.errors);

    // Defence in depth: even if _omit were ignored, nothing private leaves this route.
    const items = ((recordsResult.data as any[]) || []).map((item) => {
      const safe = { ...item };
      for (const field of PRIVATE_OFFER_FIELDS) delete safe[field];
      return safe;
    });

    const aggregate = countResult.data as any;
    const total =
      aggregate?._aggregate?._count ??
      aggregate?._count ??
      (Array.isArray(aggregate) ? aggregate[0]?._aggregate?._count : undefined) ??
      items.length;

    console.log(`[API /offers] returned ${items.length} of ${total} services`);

    return NextResponse.json({
      ok: true,
      data: { items, total, offset, limit, hasMore: offset + items.length < total },
    });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/offers", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
