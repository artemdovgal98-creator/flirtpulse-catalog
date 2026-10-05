import { NextResponse } from "next/server";
import { getAdminGuard } from "@/lib/admin";
import { canManage } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";

/** Tells the client whether the admin panel is currently unlocked. */
export async function GET() {
  try {
    const guard = await getAdminGuard();
    const { isAdmin, email, isListedAdmin, role } = guard;
    return NextResponse.json({ ok: true, data: { isAdmin, email, isListedAdmin, role, canManage: canManage(guard) } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/me", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
