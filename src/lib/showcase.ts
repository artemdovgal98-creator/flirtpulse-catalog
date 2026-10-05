import {
  ACCESS_MODELS,
  AI_SUBFILTERS,
  CATEGORIES,
  GEO_CODES,
  PAYOUT_MODELS,
  SHOWCASE_STATUSES,
} from "@/lib/catalog";
import { LANGUAGES } from "@/lib/languages";

/** Body of the admin showcase form (create + edit). */
export interface ShowcasePayload {
  name?: string;
  short_name?: string;
  description?: string;
  category?: string[];
  /** Legacy alias accepted for `geo`. */
  geos?: string[];
  geo?: string[];
  tags?: string;
  offer_url?: string;
  subid_template?: string;
  /** Id of an `affiliate_network` row, or "" for a direct link. */
  affiliate_network?: string | null;
  payout_model?: string;
  images?: Array<{ name: string }>;
  status?: string;
  is_featured?: string;
  subfilters?: string[];
  languages?: string[];
  access_model?: string;
}

const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as string[];

/**
 * Makes a pasted tracking link safe to hand to `NextResponse.redirect`.
 * Accepts `example.com/?a=1` and turns it into `https://example.com/?a=1`;
 * rejects anything that is not http(s) so no `javascript:` URL can be stored.
 * `{click_id}`-style placeholders are kept verbatim (no URL-encoding).
 */
export function normaliseTrackingUrl(raw: string): { url: string } | { error: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { url: "" };
  if (/\s/.test(trimmed)) return { error: "Tracking link must not contain spaces" };

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "Tracking link is not a valid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Tracking link must start with http:// or https://" };
  }
  if (!parsed.hostname.includes(".")) return { error: "Tracking link has no valid domain" };
  // Keep the admin's exact string (placeholders like {click_id} must survive).
  return { url: candidate };
}

function cleanList(values: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (!s || out.includes(s)) continue;
    if (allowed && !allowed.includes(s)) continue;
    out.push(s);
  }
  return out;
}

/**
 * Validates and normalises the admin showcase form payload.
 * `categoryKeys` = every key of `catalog_category` (dynamic, admin-managed);
 * falls back to the legacy static list when not supplied.
 * Status is returned as requested — publishing rules are enforced by the route.
 */
export function normaliseShowcase(
  body: ShowcasePayload,
  categoryKeys: readonly string[] = CATEGORIES
): { value: Record<string, any> } | { error: string } {
  const name = (body.name || "").trim();
  if (!name) return { error: "Title is required" };

  const link = normaliseTrackingUrl(body.offer_url || "");
  if ("error" in link) return { error: link.error };

  const status = (SHOWCASE_STATUSES as readonly string[]).includes(body.status || "")
    ? (body.status as string)
    : "draft";

  const payout = String(body.payout_model || "").trim();
  const access = String(body.access_model || "").trim();
  const network = String(body.affiliate_network || "").trim();

  const value: Record<string, any> = {
    name: name.slice(0, 160),
    short_name: (body.short_name || "").trim().slice(0, 60),
    // Sent on every save, empty string included, so clearing the field really
    // clears it in the database instead of leaving the previous text behind.
    description: (body.description || "").trim(),
    category: cleanList(body.category, categoryKeys),
    geo: cleanList(body.geo ?? body.geos, GEO_CODES),
    tags: (body.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(","),
    offer_url: link.url,
    subid_template: (body.subid_template || "").trim().slice(0, 500),
    affiliate_network: /^[a-f0-9]{24}$/i.test(network) ? network : null,
    payout_model: (PAYOUT_MODELS as readonly string[]).includes(payout) ? payout : null,
    access_model: (ACCESS_MODELS as readonly string[]).includes(access) ? access : null,
    subfilters: cleanList(body.subfilters, AI_SUBFILTERS),
    languages: cleanList(body.languages, LANGUAGE_CODES),
    status,
    is_featured: body.is_featured === "yes" ? "yes" : "no",
  };

  if (Array.isArray(body.images)) {
    // Totalum expects the COMPLETE array on every edit, capped at 3 images, and
    // only the `name` key — sending back the signed `url` corrupts the field.
    const images: Array<{ name: string }> = [];
    for (const file of body.images) {
      const fileName = typeof file?.name === "string" ? file.name.trim() : "";
      if (!fileName) continue;
      if (images.some((f) => f.name === fileName)) continue;
      images.push({ name: fileName });
      if (images.length === 3) break;
    }
    value.images = images;
  }

  return { value };
}
