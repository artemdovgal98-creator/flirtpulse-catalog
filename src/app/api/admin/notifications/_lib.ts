import "server-only";
import { parseJson } from "@/lib/server/db";
import { str, toIsoOrNull, yesNo } from "../networks/_lib/shared";
import { validLink } from "../ticker/_lib";

export const NOTIFICATION_TYPES = ["new_showcase", "novelty", "news"] as const;

export interface NotificationTranslations {
  title: Record<string, string>;
  body: Record<string, string>;
}

export function readTranslations(value: unknown): NotificationTranslations {
  const t = parseJson<Partial<NotificationTranslations>>(value, {});
  return { title: { ...(t.title || {}) }, body: { ...(t.body || {}) } };
}

export function toClient(row: any) {
  return { ...row, translations: readTranslations(row?.translations), push_sent: Number(row?.push_sent) || 0 };
}

export function normaliseNotification(
  body: Record<string, any>,
  partial = false
): { value: Record<string, unknown> } | { error: string } {
  const v: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;
  if (!partial || has("title")) {
    const title = str(body.title, 160);
    if (!title) return { error: "Title is required" };
    v.title = title;
  }
  if (!partial || has("body")) v.body = str(body.body, 2000);
  if (!partial || has("link")) {
    const link = str(body.link, 1000);
    if (!validLink(link)) return { error: "Link must start with / or http(s)://" };
    v.link = link;
  }
  if (!partial || has("type")) v.type = NOTIFICATION_TYPES.includes(body.type) ? body.type : "news";
  if (!partial || has("category")) v.category = str(body.category, 60).toLowerCase();
  if (!partial || has("is_enabled")) v.is_enabled = yesNo(body.is_enabled, "yes");
  if (!partial || has("published_at")) v.published_at = toIsoOrNull(body.published_at) ?? (partial ? null : new Date().toISOString());
  return { value: v };
}
