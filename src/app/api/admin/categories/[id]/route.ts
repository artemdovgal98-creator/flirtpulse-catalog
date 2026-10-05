import { NextResponse, after } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { count, getById, remove, update } from "@/lib/server/db";
import { invalidateCategories } from "@/lib/server/categories";
import { translateToAll } from "@/lib/server/translate";
import { canManage, managerOnly } from "@/lib/server/admin-showcases";
import { normaliseCategory } from "../shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Updates a category (the key is immutable). A changed label is re-translated. */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const { id } = await context.params;
    const row = await getById<any>("catalog_category", id);
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    delete body.key;
    const normalised = normaliseCategory(body);
    if ("error" in normalised) return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    const patch = normalised.value;
    const relabel = Boolean(patch.label && patch.label !== row.label) || body.retranslate === true;

    await update("catalog_category", id, patch);
    invalidateCategories();

    if (relabel) {
      const label = (patch.label as string) || row.label;
      after(async () => {
        const translations = await translateToAll(label);
        await update("catalog_category", id, { translations: JSON.stringify(translations) });
        invalidateCategories();
        console.log(`[API /admin/categories/:id] "${row.key}" re-translated (${Object.keys(translations).length})`);
      });
    }

    await logAdmin(guard, "update", "catalog_category", id, `Updated category "${patch.label || row.label}" (${row.key})`, {
      fields: Object.keys(patch),
      retranslate: relabel,
    });
    console.log(`[API /admin/categories/:id] updated ${row.key}: ${Object.keys(patch).join(",")}`);
    return NextResponse.json({ ok: true, data: { _id: id, ...row, ...patch } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/admin/categories/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Deletes an empty category; one that still has showcases (archive included) is disabled instead. */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const { id } = await context.params;
    const row = await getById<any>("catalog_category", id);
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const used = row.key ? await count("offer", { category: { in: [row.key] } }) : 0;
    if (used > 0) {
      await update("catalog_category", id, { is_enabled: "no" });
      invalidateCategories();
      await logAdmin(guard, "disable", "catalog_category", id, `Disabled category "${row.label}" (${used} showcases, not deleted)`);
      console.log(`[API /admin/categories/:id] ${row.key} has ${used} showcases → disabled`);
      return NextResponse.json({ ok: true, data: { _id: id, disabled: true, offers: used } });
    }

    await remove("catalog_category", id);
    invalidateCategories();
    await logAdmin(guard, "delete", "catalog_category", id, `Deleted empty category "${row.label}" (${row.key})`);
    console.log(`[API /admin/categories/:id] deleted ${row.key}`);
    return NextResponse.json({ ok: true, data: { _id: id, deleted: true } });
  } catch (err: any) {
    console.error("[API ERROR] DELETE /api/admin/categories/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
