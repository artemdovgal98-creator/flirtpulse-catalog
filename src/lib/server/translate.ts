import "server-only";
import { totalumSdk } from "@/lib/totalum";
import { LANGUAGES, type Lang } from "@/lib/languages";

/**
 * Backend machine translation (Totalum-integrated OpenAI, gpt-4.1-mini).
 * Results are always cached in the database by the callers, so every string is
 * translated once. Brand names, URLs, emojis and `{placeholders}` are preserved.
 */

export const LANG_NAMES: Record<string, string> = {
  en: "English", uk: "Ukrainian", ru: "Russian", pl: "Polish", de: "German", fr: "French",
  es: "Spanish", pt: "Portuguese", it: "Italian", tr: "Turkish", ar: "Arabic", zh: "Simplified Chinese",
};

export const ALL_LANGS = LANGUAGES.map((l) => l.code) as Lang[];

const RULES =
  "Rules: keep brand and product names (e.g. FlirtPulse, Candy.ai, Telegram) exactly as written; " +
  "keep URLs, emojis, numbers and placeholders in curly braces like {n} unchanged; keep it short and natural " +
  "for an 18+ entertainment catalog UI; never add explanations.";

/** Small deterministic hash used to detect when a source text changed. */
export function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function extractJson(content: string): any {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Translator returned no JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function complete(system: string, user: string, maxTokens = 4000): Promise<any> {
  const result = await totalumSdk.openai.createChatCompletion({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    model: "gpt-4.1-mini",
    max_tokens: maxTokens,
    temperature: 0.2,
  } as any);
  const content = (result as any)?.data?.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[translate] empty completion:", (result as any)?.errors);
    throw new Error("Translator returned an empty answer");
  }
  return extractJson(String(content));
}

/**
 * Translates a key → text map into one language. Large maps are chunked.
 * Keys that come back missing are simply left out (the caller falls back to the original).
 */
export async function translateMap(
  entries: Record<string, string>,
  target: string,
  chunkSize = 60
): Promise<Record<string, string>> {
  const keys = Object.keys(entries).filter((k) => entries[k]?.trim());
  const out: Record<string, string> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < keys.length; i += chunkSize) chunks.push(keys.slice(i, i + chunkSize));

  await Promise.all(
    chunks.map(async (chunk) => {
      const payload = Object.fromEntries(chunk.map((k) => [k, entries[k]]));
      const system =
        `You translate JSON values into ${LANG_NAMES[target] || target}. ` +
        `Answer ONLY with a JSON object that has exactly the same keys. ${RULES}`;
      try {
        const json = await complete(system, JSON.stringify(payload), 6000);
        for (const k of chunk) if (typeof json?.[k] === "string" && json[k].trim()) out[k] = json[k];
      } catch (err) {
        console.error(`[translate] chunk of ${chunk.length} keys → ${target} failed:`, err);
      }
    })
  );
  console.log(`[translate] ${Object.keys(out).length}/${keys.length} strings → ${target}`);
  return out;
}

/**
 * Translates one short text (ticker line, notification, category label…) into
 * every interface language in a single call. Returns { lang: text }.
 */
export async function translateToAll(text: string, langs: string[] = ALL_LANGS): Promise<Record<string, string>> {
  const clean = (text || "").trim();
  if (!clean) return {};
  const system =
    `Translate the user's text into these languages: ${langs.map((l) => `${l} (${LANG_NAMES[l]})`).join(", ")}. ` +
    `Answer ONLY with a JSON object whose keys are the language codes. ${RULES}`;
  try {
    const json = await complete(system, clean, 3000);
    const out: Record<string, string> = {};
    for (const l of langs) if (typeof json?.[l] === "string" && json[l].trim()) out[l] = json[l].trim();
    console.log(`[translate] "${clean.slice(0, 40)}" → ${Object.keys(out).length} languages`);
    return out;
  } catch (err) {
    console.error("[translate] translateToAll failed:", err);
    return {};
  }
}

/** Picks the text for a language from a translations map, falling back to the original. */
export function pickTranslation(original: string, translations: unknown, lang: string): string {
  let map: Record<string, string> = {};
  if (translations && typeof translations === "object") map = translations as Record<string, string>;
  else if (typeof translations === "string" && translations.trim()) {
    try {
      map = JSON.parse(translations);
    } catch {
      map = {};
    }
  }
  return (map[lang] && String(map[lang]).trim()) || original;
}
