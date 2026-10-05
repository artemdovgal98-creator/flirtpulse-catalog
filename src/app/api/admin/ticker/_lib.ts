import "server-only";
import { ALL_LANGS } from "@/lib/server/translate";
import { str, toIsoOrNull, yesNo, isHttpUrl } from "../networks/_lib/shared";

export const TICKER_KINDS = ["news", "novelty", "new_showcase"] as const;

/** Relative site paths (/catalog) or absolute http(s) links. */
export function validLink(link: string): boolean {
  return !link || link.startsWith("/") || isHttpUrl(link);
}

export function normaliseTicker(body: Record<string, any>, partial = false): { value: Record<string, unknown> } | { error: string } {
  const v: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;
  if (!partial || has("text")) {
    const text = str(body.text, 280);
    if (!text) return { error: "Text is required" };
    v.text = text;
  }
  if (!partial || has("link")) {
    const link = str(body.link, 1000);
    if (!validLink(link)) return { error: "Link must start with / or http(s)://" };
    v.link = link;
  }
  if (!partial || has("kind")) v.kind = TICKER_KINDS.includes(body.kind) ? body.kind : "news";
  if (!partial || has("starts_at")) v.starts_at = toIsoOrNull(body.starts_at);
  if (!partial || has("ends_at")) v.ends_at = toIsoOrNull(body.ends_at);
  if (!partial || has("is_enabled")) v.is_enabled = yesNo(body.is_enabled, "yes");
  if (v.starts_at && v.ends_at && String(v.ends_at) < String(v.starts_at)) return { error: "End date is before the start date" };
  return { value: v };
}

/** Validates a single manual translation edit `{ lang, text }`. */
export function manualEdit(value: any): { lang: string; text: string } | null {
  if (!value || typeof value !== "object") return null;
  const lang = String(value.lang || "");
  if (!ALL_LANGS.includes(lang as any)) return null;
  return { lang, text: String(value.text ?? "").trim().slice(0, 1000) };
}
