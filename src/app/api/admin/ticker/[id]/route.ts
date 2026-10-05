import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getById, update, remove, parseJson } from "@/lib/server/db";
import { translateToAll } from "@/lib/server/translate";
import { okJson, errJson, serverError } from "../../networks/_lib/shared";
import { normaliseTicker, manualEdit } from "../_lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function toClient(row: any) {
  return { ...row, translations: parseJson<Record<string, string>>(row?.translations, {}) };
}

/**
 * Updates a ticker line. A changed text (or `retranslate: true`) re-translates
 * every language; `translation: { lang, text }` stores a manual edit for one
 * language (empty text removes it so the original is shown).
 */
export async function PUT(request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("ticker_item", id);
    if (!row) return errJson("Ticker item not found", 404);

    const body = (await request.json()) as Record<string, any>;
    const n = normaliseTicker(body, true);
    if ("error" in n) return errJson(n.error);
    const patch: Record<string, unknown> = { ...n.value };

    let translations = parseJson<Record<string, string>>(row.translations, {});
    const textChanged = patch.text !== undefined && patch.text !== row.text;
    if (textChanged || body.retranslate === true) {
      translations = await translateToAll(String(patch.text ?? row.text));
      patch.translations = translations;
      console.log(`[API /admin/ticker/:id] re-translated ${id} → ${Object.keys(translations).length} languages`);
    }
    const edit = manualEdit(body.translation);
    if (body.translation !== undefined && !edit) return errJson("Invalid translation edit");
    if (edit) {
      if (edit.text) translations[edit.lang] = edit.text;
      else delete translations[edit.lang];
      patch.translations = translations;
    }

    await update("ticker_item", id, patch);
    await logAdmin(
      guard,
      edit ? "translate_edit" : "update",
      "ticker_item",
      id,
      edit ? `Ticker translation (${edit.lang}) edited` : `Ticker item updated: ${Object.keys(patch).join(", ")}`,
      { fields: Object.keys(patch), lang: edit?.lang }
    );
    const fresh = (await getById<any>("ticker_item", id)) ?? { ...row, ...patch };
    return okJson({ item: toClient(fresh) });
  } catch (err) {
    return serverError("PUT /api/admin/ticker/[id]", err);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const { id } = await context.params;
    const row = await getById<any>("ticker_item", id);
    if (!row) return errJson("Ticker item not found", 404);
    await remove("ticker_item", id);
    await logAdmin(guard, "delete", "ticker_item", id, `Ticker item deleted: ${String(row.text || "").slice(0, 120)}`);
    console.log(`[API /admin/ticker/:id] deleted ${id}`);
    return okJson({ deleted: id });
  } catch (err) {
    return serverError("DELETE /api/admin/ticker/[id]", err);
  }
}
