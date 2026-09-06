import { NextResponse } from "next/server";
import { getAdminGuard } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Tells the client whether the current session may see the admin dashboard. */
export async function GET() {
  try {
    const { isAdmin, email } = await getAdminGuard();
    return NextResponse.json({ ok: true, data: { isAdmin, email } });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/me", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
