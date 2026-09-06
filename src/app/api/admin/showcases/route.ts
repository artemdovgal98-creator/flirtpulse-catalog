import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard } from "@/lib/admin";
import { normaliseShowcase, type ShowcasePayload } from "@/lib/showcase";
import { slugify } from "@/data/offers";

export const dynamic = "force-dynamic";

/** Lists every showcase, including the hidden tracking links (admins only). */
export async function GET(request: Request) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const params = new URL(request.url).searchParams;
    const q = (params.get("q") || "").trim();
    const onlyCustom = params.get("custom") === "1";

    const filter: Record<string, any> = {};
    if (onlyCustom) filter.is_custom = "yes";
    if (q) filter.name = { regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), options: "i" };

    const result = await totalumSdk.crud.query("offer", {
      ...(Object.keys(filter).length ? { _filter: filter } : {}),
      _sort: { createdAt: "desc" },
      _limit: 200,
    } as any);
    if (result.errors) console.error("[API /admin/showcases] sdk errors:", result.errors);

    const items = (result.data as any[]) || [];
    console.log(`[API /admin/showcases] returning ${items.length} showcases (custom=${onlyCustom})`);

    return NextResponse.json({ ok: true, data: { items } });
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
      launch_date: new Date().toISOString(),
    };

    const created = await totalumSdk.crud.createRecord("offer", record as any);
    if (created.errors) {
      console.error("[API /admin/showcases] create errors:", created.errors);
      throw new Error(JSON.stringify(created.errors));
    }

    console.log(`[API /admin/showcases] created "${record.name}" -> ${(created.data as any)?._id}`);

    return NextResponse.json({ ok: true, data: { item: created.data } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
