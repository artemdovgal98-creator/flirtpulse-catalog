import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, create, update } from "@/lib/server/db";
import { canManage, managerOnly, refId } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";

const ROLES = ["admin", "editor", "none"] as const;

/** Admin accounts (admin_user) with their role. */
export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const rows = await query<any>("admin_user", { _sort: { createdAt: "desc" }, _limit: 200 });
    const items = rows.map((r) => ({
      _id: r._id,
      email: r.email || "",
      role: r.role || "none",
      user: refId(r.user),
      granted_at: r.granted_at || r.createdAt,
    }));
    return NextResponse.json({ ok: true, data: { items, can_manage: canManage(guard), me: guard.email } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/roles", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * Grants a role to a registered account by e-mail: { email, role }.
 * The account must exist (the guard matches admin_user.user to the session user).
 */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const body = (await request.json().catch(() => ({}))) as { email?: string; role?: string };
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "editor");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (!(ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ ok: false, error: "INVALID_ROLE" }, { status: 400 });
    }

    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const users = await query<any>("user", { _filter: { email: { regex: `^${escaped}$`, options: "i" } }, _limit: 1 });
    const user = users[0];
    if (!user) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    const existing = (await query<any>("admin_user", { _filter: { user: user._id }, _limit: 1 }))[0];
    let id: string;
    if (existing) {
      id = existing._id;
      await update("admin_user", id, { role, email });
    } else {
      id = await create("admin_user", { email, role, user: user._id, granted_at: new Date().toISOString() });
    }

    await logAdmin(guard, "role_grant", "admin_user", id, `Role "${role}" granted to ${email}`);
    console.log(`[API /admin/roles] ${email} → ${role}`);
    return NextResponse.json({ ok: true, data: { _id: id, email, role } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/roles", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
