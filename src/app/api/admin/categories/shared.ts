import "server-only";
import { GEO_CODES, AI_SUBFILTERS, COLOR_GRADIENT } from "@/lib/catalog";

export const CATEGORY_COLORS = Object.keys(COLOR_GRADIENT);

/** Validates the editable fields of a catalog_category row (key handled by the caller). */
export function normaliseCategory(body: Record<string, any>): { value: Record<string, any> } | { error: string } {
  const value: Record<string, any> = {};
  if ("label" in body) {
    const label = String(body.label || "").trim();
    if (!label) return { error: "LABEL_REQUIRED" };
    value.label = label.slice(0, 60);
  }
  if ("emoji" in body) value.emoji = String(body.emoji || "").trim().slice(0, 8) || "✨";
  if ("color" in body) value.color = CATEGORY_COLORS.includes(body.color) ? body.color : "fuchsia";
  if ("sort_order" in body) {
    const n = Number(body.sort_order);
    value.sort_order = Number.isFinite(n) ? Math.round(n) : 99;
  }
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : String(v ?? "").split(","))
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean);
  if ("geo_only" in body) value.geo_only = list(body.geo_only).filter((g) => GEO_CODES.includes(g)).join(",");
  if ("subfilters" in body) {
    value.subfilters = list(body.subfilters)
      .filter((s) => (AI_SUBFILTERS as readonly string[]).includes(s))
      .join(",");
  }
  if ("is_enabled" in body) value.is_enabled = body.is_enabled === "no" || body.is_enabled === false ? "no" : "yes";
  return { value };
}
