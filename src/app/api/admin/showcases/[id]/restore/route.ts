import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Brings an archived showcase back as a draft. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const existing = await getById<any>("offer", id);
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    await update("offer", id, { status: "draft", archived_at: null });
    await logAdmin(guard, "restore", "offer", id, `Restored "${existing.name}" to draft (was ${existing.status})`);
    console.log(`[API /admin/showcases/:id/restore] ${id} "${existing.name}" → draft`);

    return NextResponse.json({ ok: true, data: { id, status: "draft" } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases/[id]/restore", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
