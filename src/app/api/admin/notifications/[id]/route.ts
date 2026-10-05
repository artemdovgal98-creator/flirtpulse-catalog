import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, remove } from "@/lib/server/db";
import { translateToAll, ALL_LANGS } from "@/lib/server/translate";
import { okJson, errJson, serverError } from "../../networks/_lib/shared";
import { normaliseNotification, readTranslations, toClient } from "../_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/**
 * Updates a notification. Changed title/body (or `retranslate: true`) are
 * re-translated; `translation: { field: "title"|"body", lang, text }` stores a
 * manual edit for one language (empty text removes it).
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("notification", id);
    if (!row) return errJson("Notification not found", 404);

    const body = (await request.json()) as Record<string, any>;
    const n = normaliseNotification(body, true);
    if ("error" in n) return errJson(n.error);
    const patch: Record<string, unknown> = { ...n.value };
    const translations = readTranslations(row.translations);
    let touched = false;

    const titleChanged = patch.title !== undefined && patch.title !== row.title;
    const bodyChanged = patch.body !== undefined && patch.body !== (row.body ?? "");
    if (titleChanged || body.retranslate === true) {
      translations.title = await translateToAll(String(patch.title ?? row.title));
      touched = true;
    }
    if (bodyChanged || body.retranslate === true) {
      const text = String(patch.body ?? row.body ?? "");
      translations.body = text ? await translateToAll(text) : {};
      touched = true;
    }

    const edit = body.translation as { field?: string; lang?: string; text?: string } | undefined;
    if (edit !== undefined) {
      if (!edit || (edit.field !== "title" && edit.field !== "body") || !ALL_LANGS.includes(String(edit.lang) as any)) {
        return errJson("Invalid translation edit");
      }
      const text = String(edit.text ?? "").trim().slice(0, 2000);
      const map = translations[edit.field];
      if (text) map[String(edit.lang)] = text;
      else delete map[String(edit.lang)];
      touched = true;
    }
    if (touched) patch.translations = translations;

    await update("notification", id, patch);
    await logAdmin(
      guard,
      edit ? "translate_edit" : "update",
      "notification",
      id,
      edit ? `Notification translation (${edit.field}/${edit.lang}) edited` : `Notification updated: ${Object.keys(patch).join(", ")}`,
      { fields: Object.keys(patch) }
    );
    const fresh = (await getById<any>("notification", id)) ?? { ...row, ...patch };
    console.log(`[API /admin/notifications/:id] updated ${id}: ${Object.keys(patch).join(", ")}`);
    return okJson({ item: toClient(fresh) });
  } catch (err) {
    return serverError("PUT /api/admin/notifications/[id]", err);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("notification", id);
    if (!row) return errJson("Notification not found", 404);
    await remove("notification", id);
    await logAdmin(guard, "delete", "notification", id, `Notification deleted: ${String(row.title || "").slice(0, 120)}`);
    console.log(`[API /admin/notifications/:id] deleted ${id}`);
    return okJson({ deleted: id });
  } catch (err) {
    return serverError("DELETE /api/admin/notifications/[id]", err);
  }
}
