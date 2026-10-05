import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getEditableStrings, setManualStrings, getUiStrings } from "@/lib/server/ui-i18n";
import { ALL_LANGS } from "@/lib/server/translate";
import { okJson, errJson, serverError } from "../networks/_lib/shared";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** English is the source language, so it is not editable here. */
function validLang(lang: string | null): lang is string {
  return Boolean(lang) && lang !== "en" && ALL_LANGS.includes(lang as any);
}

/** Interface strings of one language: `?lang=de` → [{ key, en, value, manual }]. */
export async function GET(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const lang = new URL(request.url).searchParams.get("lang");
    if (!validLang(lang)) return errJson("Unsupported language");
    const items = await getEditableStrings(lang);
    const missing = items.filter((i) => !i.value).length;
    console.log(`[API /admin/translations] ${lang}: ${items.length} strings, ${missing} missing`);
    return okJson({ lang, items, missing });
  } catch (err) {
    return serverError("GET /api/admin/translations", err);
  }
}

/** Saves manual overrides `{ lang, edits: { key: text } }` (empty text removes the override). */
export async function PUT(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const body = (await request.json()) as { lang?: string; edits?: Record<string, unknown> };
    const lang = String(body.lang || "");
    if (!validLang(lang)) return errJson("Unsupported language");
    const edits: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.edits || {})) {
      if (typeof k === "string" && k.length <= 120) edits[k] = String(v ?? "").slice(0, 2000);
    }
    const keys = Object.keys(edits);
    if (!keys.length) return errJson("Nothing to save");
    const manual = await setManualStrings(lang, edits);
    await logAdmin(guard, "translate_edit", "ui_translation", lang, `UI strings edited (${lang}): ${keys.length} key(s)`, {
      keys: keys.slice(0, 50),
    });
    console.log(`[API /admin/translations] ${lang}: saved ${keys.length} manual edits`);
    return okJson({ lang, saved: keys.length, manual_count: Object.keys(manual).length });
  } catch (err) {
    return serverError("PUT /api/admin/translations", err);
  }
}

/** "Fill missing translations": machine-translates every missing key of `{ lang }` and waits for it. */
export async function POST(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const body = (await request.json()) as { lang?: string };
    const lang = String(body.lang || "");
    if (!validLang(lang)) return errJson("Unsupported language");
    console.log(`[API /admin/translations] filling missing strings → ${lang}`);
    const { pending } = await getUiStrings(lang, true);
    await logAdmin(guard, "translate_fill", "ui_translation", lang, `Missing UI strings generated (${lang}), still pending: ${pending}`);
    return okJson({ lang, pending });
  } catch (err) {
    return serverError("POST /api/admin/translations", err);
  }
}
