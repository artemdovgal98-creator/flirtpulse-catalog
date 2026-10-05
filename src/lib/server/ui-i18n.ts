import "server-only";
import { DICTS, EN_DICT, type Dict } from "@/lib/i18n-dicts";
import { query, create, update, parseJson } from "@/lib/server/db";
import { translateMap, hashText, ALL_LANGS } from "@/lib/server/translate";

/**
 * Interface strings for every language. The static dictionaries cover en/ru
 * fully; every other language gets the missing keys translated once by the
 * backend and cached in `ui_translation` (strings = machine, manual = admin edits).
 */

interface Stored {
  v: Record<string, string>; // key → translated text
  src: Record<string, string>; // key → hash of the English source used
}

interface Row {
  _id: string;
  language: string;
  strings?: unknown;
  manual?: unknown;
}

const inflight = new Set<string>();

async function getRow(lang: string): Promise<Row | null> {
  const rows = await query<Row>("ui_translation", { _filter: { language: lang }, _limit: 1 });
  return rows[0] || null;
}

function missingKeys(lang: string, stored: Stored): Record<string, string> {
  const own = DICTS[lang as keyof typeof DICTS] || {};
  const out: Record<string, string> = {};
  for (const [k, text] of Object.entries(EN_DICT)) {
    if (own[k]) continue;
    if (stored.v[k] && stored.src[k] === hashText(text)) continue;
    out[k] = text;
  }
  return out;
}

async function fill(lang: string): Promise<void> {
  if (inflight.has(lang)) return;
  inflight.add(lang);
  try {
    const row = await getRow(lang);
    const stored = parseJson<Stored>(row?.strings, { v: {}, src: {} });
    stored.v ||= {};
    stored.src ||= {};
    const todo = missingKeys(lang, stored);
    if (!Object.keys(todo).length) return;
    console.log(`[ui-i18n] translating ${Object.keys(todo).length} strings → ${lang}`);
    const done = await translateMap(todo, lang);
    for (const [k, v] of Object.entries(done)) {
      stored.v[k] = v;
      stored.src[k] = hashText(todo[k]);
    }
    // Re-read so a concurrent manual edit is not overwritten.
    const fresh = await getRow(lang);
    if (fresh) await update("ui_translation", fresh._id, { strings: stored });
    else await create("ui_translation", { language: lang, strings: stored, manual: {} });
  } catch (err) {
    console.error(`[ui-i18n] filling ${lang} failed:`, err);
  } finally {
    inflight.delete(lang);
  }
}

/** Strings for a language (machine + manual overrides) and how many are still missing. */
export async function getUiStrings(lang: string, wait = false): Promise<{ strings: Dict; pending: number }> {
  if (lang === "en" || !ALL_LANGS.includes(lang as any)) return { strings: {}, pending: 0 };
  let row = await getRow(lang);
  let stored = parseJson<Stored>(row?.strings, { v: {}, src: {} });
  stored.v ||= {};
  stored.src ||= {};
  let pending = Object.keys(missingKeys(lang, stored)).length;
  if (pending > 0) {
    if (wait) {
      await fill(lang);
      row = await getRow(lang);
      stored = parseJson<Stored>(row?.strings, { v: {}, src: {} });
      stored.v ||= {};
      stored.src ||= {};
      pending = Object.keys(missingKeys(lang, stored)).length;
    } else {
      void fill(lang);
    }
  }
  const manual = parseJson<Record<string, string>>(row?.manual, {});
  return { strings: { ...stored.v, ...manual }, pending };
}

/** Admin: manual overrides for a language. Empty value removes the override. */
export async function setManualStrings(lang: string, edits: Record<string, string>): Promise<Record<string, string>> {
  const row = await getRow(lang);
  const manual = parseJson<Record<string, string>>(row?.manual, {});
  for (const [k, v] of Object.entries(edits)) {
    if (v && v.trim()) manual[k] = v.trim();
    else delete manual[k];
  }
  if (row) await update("ui_translation", row._id, { manual });
  else await create("ui_translation", { language: lang, strings: { v: {}, src: {} }, manual });
  return manual;
}

/** Admin: current effective strings for editing (static dict + machine + manual). */
export async function getEditableStrings(lang: string) {
  const row = await getRow(lang);
  const stored = parseJson<Stored>(row?.strings, { v: {}, src: {} });
  const manual = parseJson<Record<string, string>>(row?.manual, {});
  const own = DICTS[lang as keyof typeof DICTS] || {};
  return Object.keys(EN_DICT).map((key) => ({
    key,
    en: EN_DICT[key],
    value: manual[key] ?? own[key] ?? stored.v?.[key] ?? "",
    manual: key in manual,
  }));
}
