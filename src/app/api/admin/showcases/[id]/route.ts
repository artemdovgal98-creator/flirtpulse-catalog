import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminGuard } from "@/lib/admin";
import { normaliseShowcase, type ShowcasePayload } from "@/lib/showcase";

export const dynamic = "force-dynamic";

/** Updates a showcase: title, description, categories, images and tracking link. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const body = (await request.json()) as ShowcasePayload;
    const normalised = normaliseShowcase(body);
    if ("error" in normalised) {
      return NextResponse.json({ ok: false, error: normalised.error }, { status: 400 });
    }

    // Mark the card as hand-managed so re-seeding the catalog never overwrites it.
    const payload = { ...normalised.value, admin_edited: "yes" };

    const updated = await totalumSdk.crud.editRecordById("offer", id, payload as any);
    if (updated.errors) {
      console.error("[API /admin/showcases/:id] update errors:", updated.errors);
      throw new Error(JSON.stringify(updated.errors));
    }

    // `editRecordById` answers with a write receipt ({ acknowledged, modifiedCount }),
    // NOT with the record. Re-reading it is what makes the admin list show the new
    // title, description and images instead of silently keeping the old ones.
    const saved = await totalumSdk.crud.getRecordById("offer", id);
    if (saved.errors) console.error("[API /admin/showcases/:id] re-read errors:", saved.errors);
    const item = (saved.data as any) ?? { _id: id, ...payload };

    console.log(
      `[API /admin/showcases/:id] updated ${id} ("${item.name}") desc=${(item.description || "").length} chars images=${(item.images || []).length} link=${item.offer_url || "-"}`
    );

    return NextResponse.json({ ok: true, data: { item } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/admin/showcases/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/** Permanently removes a showcase. */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { isAdmin } = await getAdminGuard();
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const { id } = await context.params;
    const deleted = await totalumSdk.crud.deleteRecordById("offer", id);
    if (deleted.errors) {
      console.error("[API /admin/showcases/:id] delete errors:", deleted.errors);
      throw new Error(JSON.stringify(deleted.errors));
    }

    console.log(`[API /admin/showcases/:id] deleted ${id}`);

    return NextResponse.json({ ok: true, data: { id } });
  } catch (err: any) {
    console.error("[API ERROR] DELETE /api/admin/showcases/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
