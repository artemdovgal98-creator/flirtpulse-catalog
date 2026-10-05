import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { query, create, getById, update } from "@/lib/server/db";
import { translateToAll } from "@/lib/server/translate";
import { pushToSubscribers } from "@/lib/server/webpush";
import { okJson, errJson, serverError } from "../networks/_lib/shared";
import { normaliseNotification, toClient } from "./_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const rows = await query<any>("notification", { _sort: { published_at: "desc", createdAt: "desc" }, _limit: 500 });
    console.log(`[API /admin/notifications] listed ${rows.length} notifications`);
    return okJson({ items: rows.map(toClient) });
  } catch (err) {
    return serverError("GET /api/admin/notifications", err);
  }
}

/** Creates a bell notification, translates title + body, optionally pushes it (`send_push: true`). */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const body = (await request.json()) as Record<string, any>;
    const n = normaliseNotification(body);
    if ("error" in n) return errJson(n.error);

    const [title, text] = await Promise.all([
      translateToAll(String(n.value.title)),
      n.value.body ? translateToAll(String(n.value.body)) : Promise.resolve({} as Record<string, string>),
    ]);
    const translations = { title, body: text };
    const id = await create("notification", { ...n.value, translations, push_sent: 0 });

    let pushed: number | null = null;
    if (body.send_push === true && n.value.is_enabled === "yes") {
      pushed = await pushToSubscribers((n.value.category as string) || undefined);
      await update("notification", id, { push_sent: pushed });
    }

    await logAdmin(guard, "create", "notification", id, `Notification created: ${String(n.value.title).slice(0, 120)}`, {
      type: n.value.type,
      category: n.value.category,
      pushed,
    });
    const row = await getById<any>("notification", id);
    console.log(`[API /admin/notifications] created ${id} title-langs=${Object.keys(title).length} pushed=${pushed ?? "-"}`);
    return okJson({ item: toClient(row ?? { _id: id, ...n.value, translations }), pushed }, 201);
  } catch (err) {
    return serverError("POST /api/admin/notifications", err);
  }
}
