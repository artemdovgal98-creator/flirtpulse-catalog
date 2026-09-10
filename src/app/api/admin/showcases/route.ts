import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard } from "@/lib/admin";
import { normaliseShowcase, type ShowcasePayload } from "@/lib/showcase";
import { slugify } from "@/data/offers";

export const dynamic = "force-dynamic";

/**
 * Lists showcases with their hidden tracking links (admins only).
 * Paginated so the whole catalog — seeded cards included — is manageable.
 */
export async function GET(request: Request) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim();
    const category = (params.get("category") || "").trim();
    const onlyCustom = params.get("custom") === "1";
    const onlyEdited = params.get("edited") === "1";
    const offset = Math.max(0, Number(params.get("offset") || 0));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") || 30)));

    const filter: Record<string, any> = {};
    if (onlyCustom) filter.is_custom = "yes";
    if (category) filter.category = { in: [category] };
    if (q) {
      const regex = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };
      filter._or = [{ name: regex }, { tags: regex }, { description: regex }];
    }
    // `admin_edited` marks cards the administrator has saved by hand.
    if (onlyEdited) filter.admin_edited = "yes";

    const hasFilter = Object.keys(filter).length > 0;

    const [recordsResult, countResult] = await Promise.all([
      totalumSdk.crud.query("offer", {
        ...(hasFilter ? { _filter: filter } : {}),
        _sort: { is_custom: "desc", name: "asc" },
        _limit: limit,
        _offset: offset,
      } as any),
      totalumSdk.crud.query("offer", {
        ...(hasFilter ? { _filter: filter } : {}),
        _aggregate: { _count: true },
      } as any),
    ]);
    if (recordsResult.errors) console.error("[API /admin/showcases] sdk errors:", recordsResult.errors);

    const items = (recordsResult.data as any[]) || [];
    const aggregate = countResult.data as any;
    const total =
      aggregate?._aggregate?._count ??
      aggregate?._count ??
      (Array.isArray(aggregate) ? aggregate[0]?._aggregate?._count : undefined) ??
      items.length;

    console.log(
      `[API /admin/showcases] returning ${items.length} of ${total} showcases (offset=${offset}, q="${q}", category="${category}")`
    );

    return NextResponse.json({
      ok: true,
      data: { items, total, offset, limit, hasMore: offset + items.length < total },
    });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/showcases", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Creates a new custom showcase card. */
export async function POST(request: Request) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as ShowcasePayload;
    const normalised = normaliseShowcase(body);
    if ("error" in normalised) {
      return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    }

    const record: Record<string, any> = {
      ...normalised.value,
      slug: slugify(`${normalised.value.name}-custom-${Date.now()}`),
      network: "Custom",
      quality_score: 95,
      click_count: 0,
      is_custom: "yes",
      admin_edited: "yes",
      launch_date: new Date().toISOString(),
    };

    const created = await totalumSdk.crud.createRecord("offer", record as any);
    if (created.errors) {
      console.error("[API /admin/showcases] create errors:", created.errors);
      throw new Error(JSON.stringify(created.errors));
    }

    // `createRecord` answers with { acknowledged, insertedId } — read the row back
    // so the client receives the real card (with signed image URLs), not a receipt.
    const newId = (created.data as any)?.insertedId ?? (created.data as any)?._id;
    let item: any = { _id: newId, ...record };
    if (newId) {
      const saved = await totalumSdk.crud.getRecordById("offer", String(newId));
      if (saved.errors) console.error("[API /admin/showcases] re-read errors:", saved.errors);
      if (saved.data) item = saved.data;
    }

    console.log(
      `[API /admin/showcases] created "${item.name}" -> ${newId} desc=${(item.description || "").length} chars images=${(item.images || []).length}`
    );

    return NextResponse.json({ ok: true, data: { item } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
