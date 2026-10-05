import "server-only";
import { str, toIsoOrNull, yesNo, csvField, isHttpUrl } from "../networks/_lib/shared";

export const AD_SLOTS = [
  "home_between_categories",
  "catalog_inline",
  "showcase_page",
  "ai_section",
  "sex_shop",
  "bottom_banner",
] as const;
export const AD_DEVICES = ["all", "mobile", "desktop"] as const;
export const AD_KINDS = ["html", "image"] as const;

/** Validates an ad payload. `partial` allows updates that omit fields. */
export function normaliseAd(
  body: Record<string, any>,
  partial = false
): { value: Record<string, unknown> } | { error: string } {
  const v: Record<string, unknown> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has("name")) {
    const name = str(body.name, 120);
    if (!name) return { error: "Name is required" };
    v.name = name;
  }
  if (!partial || has("slot")) {
    if (!AD_SLOTS.includes(body.slot)) return { error: "Invalid slot" };
    v.slot = body.slot;
  }
  if (!partial || has("device")) v.device = AD_DEVICES.includes(body.device) ? body.device : "all";
  if (!partial || has("kind")) {
    if (!AD_KINDS.includes(body.kind)) return { error: "Kind must be html or image" };
    v.kind = body.kind;
  }
  if (!partial || has("geo")) v.geo = csvField(body.geo, true);
  if (!partial || has("language")) v.language = csvField(body.language, false);
  if (!partial || has("html")) v.html = String(body.html ?? "").slice(0, 20000);
  if (!partial || has("link_url")) {
    const link = str(body.link_url, 2000);
    if (link && !isHttpUrl(link)) return { error: "Link must be an http(s) URL" };
    v.link_url = link;
  }
  if (!partial || has("starts_at")) v.starts_at = toIsoOrNull(body.starts_at);
  if (!partial || has("ends_at")) v.ends_at = toIsoOrNull(body.ends_at);
  if (!partial || has("priority")) {
    const p = Number(body.priority);
    v.priority = Number.isFinite(p) ? Math.round(p) : 0;
  }
  if (!partial || has("is_enabled")) v.is_enabled = yesNo(body.is_enabled, "yes");
  if (!partial || has("image")) {
    const name = body.image && typeof body.image === "object" ? String(body.image.name || "") : "";
    v.image = name ? { name } : null;
  }

  if (v.starts_at && v.ends_at && String(v.ends_at) < String(v.starts_at)) {
    return { error: "End date is before the start date" };
  }
  return { value: v };
}

export function withCtr<T extends Record<string, any>>(row: T) {
  const impressions = Number(row.impressions) || 0;
  const clicks = Number(row.clicks) || 0;
  return { ...row, impressions, clicks, ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0 };
}
