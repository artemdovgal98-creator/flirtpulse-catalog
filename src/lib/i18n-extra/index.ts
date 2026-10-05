/**
 * Strings added after the original dictionaries. English is the source; Russian
 * is hand-written. The other 10 languages are produced by the backend translator
 * (`/api/i18n/[lang]`) and cached in the `ui_translation` table.
 */
import * as core from "./core";
import * as admin from "./admin";
import * as admin2 from "./admin2";
import * as engage from "./engage";

export const EXTRA_EN: Record<string, string> = { ...core.en, ...admin.en, ...admin2.en, ...engage.en };
export const EXTRA_RU: Record<string, string> = { ...core.ru, ...admin.ru, ...admin2.ru, ...engage.ru };
