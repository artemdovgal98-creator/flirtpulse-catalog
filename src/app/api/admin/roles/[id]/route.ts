import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update } from "@/lib/server/db";
import { canManage, managerOnly, refId } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";

/** Changes the role of an admin account: { role: admin | editor | none }. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { role?: string };
    const role = String(body.role || "");
    if (!["admin", "editor", "none"].includes(role)) {
      return NextResponse.json({ ok: false, error: "INVALID_ROLE" }, { status: 400 });
    }
    const row = await getById<any>("admin_user", id);
    if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    // A signed-in admin cannot lock themselves out by accident.
    if (guard.userId && refId(row.user) === guard.userId && role !== "admin" && guard.role === "admin") {
      return NextResponse.json({ ok: false, error: "CANNOT_DEMOTE_SELF" }, { status: 400 });
    }

    await update("admin_user", id, { role });
    await logAdmin(guard, "role_change", "admin_user", id, `Role of ${row.email || id}: ${row.role || "none"} → ${role}`);
    console.log(`[API /admin/roles/:id] ${row.email || id} → ${role}`);
    return NextResponse.json({ ok: true, data: { _id: id, role } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/admin/roles/[id]", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
