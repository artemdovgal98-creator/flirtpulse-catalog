import { NextResponse, after } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update } from "@/lib/server/db";
import { announceShowcase } from "@/lib/server/announce";
import {
  canManage,
  failedHardChecks,
  managerOnly,
  requestOrigin,
  statusChange,
} from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ACTIONS = ["publish", "review", "draft", "archive", "restore", "top", "untop"] as const;
type Action = (typeof ACTIONS)[number];

const TARGET: Partial<Record<Action, string>> = {
  publish: "active",
  review: "review",
  draft: "draft",
  archive: "archived",
  restore: "draft",
};

/**
 * Bulk actions on several showcases: { ids: string[], action }.
 * `publish` runs the hard pre-publish checks per card (the reachability warning is
 * skipped to keep the batch fast) and reports the cards it had to skip.
 */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();

    const body = (await request.json().catch(() => ({}))) as { ids?: string[]; action?: string };
    const action = body.action as Action;
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    }
    if (action === "archive" && !canManage(guard)) return managerOnly();

    const ids = Array.from(new Set((body.ids || []).filter((id) => /^[a-f0-9]{24}$/i.test(String(id))))).slice(0, 200);
    if (!ids.length) return NextResponse.json({ ok: false, error: "No showcases selected" }, { status: 400 });

    const origin = requestOrigin(request);
    const updated: string[] = [];
    const skipped: Array<{ id: string; name: string; failed: string[] }> = [];
    const toAnnounce: any[] = [];

    for (let i = 0; i < ids.length; i += 5) {
      await Promise.all(
        ids.slice(i, i + 5).map(async (id) => {
          const offer = await getById<any>("offer", id);
          if (!offer) {
            skipped.push({ id, name: "?", failed: ["not_found"] });
            return;
          }
          if (action === "top" || action === "untop") {
            await update("offer", id, { is_featured: action === "top" ? "yes" : "no" });
            updated.push(id);
            return;
          }
          if (action === "restore" && offer.status !== "archived") {
            skipped.push({ id, name: offer.name, failed: ["not_archived"] });
            return;
          }
          const change = await statusChange(offer, offer, TARGET[action]!, { reachability: false });
          if (change.blocked) {
            skipped.push({ id, name: offer.name, failed: change.check ? failedHardChecks(change.check) : [] });
            return;
          }
          if (Object.keys(change.patch).length) await update("offer", id, change.patch);
          if (change.announce) toAnnounce.push({ ...offer, ...change.patch });
          updated.push(id);
        })
      );
    }

    if (toAnnounce.length) {
      after(async () => {
        for (const offer of toAnnounce) {
          await announceShowcase(offer, origin).catch((err) => console.error("[admin] bulk announce failed:", err));
        }
      });
    }

    await logAdmin(guard, `bulk_${action}`, "offer", ids.join(",").slice(0, 200), `Bulk ${action}: ${updated.length} updated, ${skipped.length} skipped`, {
      ids,
      skipped,
    });
    console.log(`[API /admin/showcases/bulk] ${action}: updated=${updated.length} skipped=${skipped.length}`);

    return NextResponse.json({ ok: true, data: { action, updated, skipped } });
  } catch (err: any) {
    console.error("[API ERROR] POST /api/admin/showcases/bulk", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
