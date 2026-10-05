import { NextResponse, after } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { count, create, update, parseJson } from "@/lib/server/db";
import { getCategoryRows, invalidateCategories } from "@/lib/server/categories";
import { translateToAll } from "@/lib/server/translate";
import { canManage, managerOnly } from "@/lib/server/admin-showcases";
import { normaliseCategory } from "./shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every category (disabled ones included) with the number of non-archived showcases. */
export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const rows = await getCategoryRows(true);
    const counts = await Promise.all(
      rows.map((r) => (r.key ? count("offer", { category: { in: [r.key] }, status: { ne: "archived" } }) : Promise.resolve(0)))
    );
    const items = rows.map((r, i) => ({
      _id: r._id,
      key: r.key,
      label: r.label,
      emoji: r.emoji || "",
      color: r.color || "fuchsia",
      sort_order: r.sort_order ?? 0,
      geo_only: r.geo_only || "",
      subfilters: r.subfilters || "",
      is_enabled: r.is_enabled === "no" ? "no" : "yes",
      translations: parseJson<Record<string, string>>(r.translations, {}),
      offers: counts[i],
    }));
    return NextResponse.json({ ok: true, data: { items, can_manage: canManage(guard) } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/categories", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Creates a category; its label is translated into every language in the background. */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const key = String(body.key || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
    if (!/^[a-z][a-z0-9_]{1,29}$/.test(key)) return NextResponse.json({ ok: false, error: "INVALID_KEY" }, { status: 400 });
    const rows = await getCategoryRows(true);
    if (rows.some((r) => r.key === key)) return NextResponse.json({ ok: false, error: "KEY_EXISTS" }, { status: 409 });

    const normalised = normaliseCategory({ ...body, label: body.label ?? "" });
    if ("error" in normalised) return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    const record: Record<string, any> = {
      sort_order: rows.length + 1,
      is_enabled: "yes",
      emoji: "✨",
      color: "fuchsia",
      ...normalised.value,
      key,
      translations: "{}",
    };
    const id = await create("catalog_category", record);
    invalidateCategories();

    const label = record.label as string;
    after(async () => {
      const translations = await translateToAll(label);
      await update("catalog_category", id, { translations: JSON.stringify(translations) });
      invalidateCategories();
      console.log(`[API /admin/categories] "${key}" label translated into ${Object.keys(translations).length} languages`);
    });

    await logAdmin(guard, "create", "catalog_category", id, `Created category "${label}" (${key})`);
    console.log(`[API /admin/categories] created ${key} → ${id}`);
    return NextResponse.json({ ok: true, data: { _id: id, ...record } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/categories", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
