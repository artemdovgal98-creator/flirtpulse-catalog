import "server-only";
import { GEO_CODES } from "@/lib/catalog";

/**
 * Visitor country, lowercase ISO code, or "" when unknown.
 * Uses the edge country header (Cloudflare / Vercel) and falls back to the
 * region part of Accept-Language ("uk-UA" → "ua").
 */
export function detectGeo(headers: Headers): string {
  const edge =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("x-country-code") ||
    "";
  const fromEdge = edge.trim().toLowerCase();
  if (fromEdge && fromEdge !== "xx" && fromEdge !== "t1") return fromEdge === "uk" ? "gb" : fromEdge;

  const accept = headers.get("accept-language") || "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim();
    const region = tag.split("-")[1]?.toLowerCase();
    if (region && region.length === 2) return region === "uk" ? "gb" : region;
  }
  // Language-only tags that unambiguously map to one country.
  const lang = accept.split(",")[0]?.split(";")[0]?.trim().toLowerCase();
  const LANG_TO_GEO: Record<string, string> = { uk: "ua", pl: "pl", cs: "cz", hu: "hu", ro: "ro", el: "gr", tr: "tr", ja: "jp", ko: "kr", vi: "vn", th: "th" };
  if (lang && LANG_TO_GEO[lang]) return LANG_TO_GEO[lang];
  return "";
}

export function isKnownGeo(code: string): boolean {
  return GEO_CODES.includes(code);
}
