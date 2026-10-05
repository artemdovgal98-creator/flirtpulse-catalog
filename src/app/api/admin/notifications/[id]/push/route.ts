import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update } from "@/lib/server/db";
import { pushToSubscribers } from "@/lib/server/webpush";
import { okJson, errJson, serverError } from "../../../networks/_lib/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Sends a web push for a notification (to the subscribers of its category, or everyone). */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("notification", id);
    if (!row) return errJson("Notification not found", 404);
    if (row.is_enabled === "no") return errJson("Enable the notification before sending a push", 409);

    const category = String(row.category || "").trim() || undefined;
    const sent = await pushToSubscribers(category);
    const total = (Number(row.push_sent) || 0) + sent;
    await update("notification", id, { push_sent: total });
    await logAdmin(guard, "push", "notification", id, `Push sent to ${sent} subscriber(s)${category ? ` (${category})` : ""}`, {
      sent,
      category,
    });
    console.log(`[API /admin/notifications/:id/push] ${id} sent=${sent}`);
    return okJson({ sent, push_sent: total });
  } catch (err) {
    return serverError("POST /api/admin/notifications/[id]/push", err);
  }
}
