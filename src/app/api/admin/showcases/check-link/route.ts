import { NextResponse } from "next/server";
import { getAdminGuard, forbidden } from "@/lib/admin";
import { runLinkChecks } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * "Check link" button of the showcase form: format, reachability (HEAD/GET, 6 s,
 * redirects followed) and duplicates among non-archived showcases.
 * Body: { url, id? } — `id` excludes the edited showcase from the duplicate search.
 * Read-only, so nothing is written to the journal.
 */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const body = (await request.json().catch(() => ({}))) as { url?: string; id?: string };
    const { url, checks } = await runLinkChecks(String(body.url || ""), body.id || undefined, { reachability: true });
    const ok = checks.every((c) => c.ok || c.level === "warning");
    console.log(`[API /admin/showcases/check-link] ${url || "(invalid)"} ok=${ok}`);
    return NextResponse.json({ ok: true, data: { url, ok, checks, checked_at: new Date().toISOString() } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases/check-link", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
