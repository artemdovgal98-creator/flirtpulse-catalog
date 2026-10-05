import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById } from "@/lib/server/db";
import { checkAndStore, failedHardChecks } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs every pre-publish check (link reachability included) and stores the result on the offer. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/i.test(id)) return NextResponse.json({ ok: false, error: "Invalid id" }, { status: 400 });
    const offer = await getById<any>("offer", id);
    if (!offer) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const check = await checkAndStore(offer, { reachability: true });
    await logAdmin(guard, "check", "offer", id, `Checked "${offer.name}": ${check.ok ? "OK" : "failed"}`, {
      failed: failedHardChecks(check),
    });
    return NextResponse.json({ ok: true, data: { check } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases/[id]/check", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
