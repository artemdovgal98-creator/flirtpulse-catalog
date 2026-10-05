import "server-only";
import { query, csv, parseJson } from "@/lib/server/db";

export interface CategoryRow {
  _id: string;
  key: string;
  label: string;
  emoji?: string;
  color?: string;
  sort_order?: number;
  geo_only?: string;
  subfilters?: string;
  is_enabled?: string;
  translations?: unknown;
}

export interface PublicCategory {
  key: string;
  label: string;
  /** Label per language ({ en: "...", de: "..." }); the client falls back to `label`. */
  labels: Record<string, string>;
  emoji: string;
  color: string;
  subfilters: string[];
  geoOnly: string[];
}

let cache: { at: number; rows: CategoryRow[] } | null = null;

export async function getCategoryRows(force = false): Promise<CategoryRow[]> {
  if (!force && cache && Date.now() - cache.at < 30_000) return cache.rows;
  const rows = await query<CategoryRow>("catalog_category", { _sort: { sort_order: "asc" }, _limit: 200 });
  cache = { at: Date.now(), rows };
  return rows;
}

export function invalidateCategories() {
  cache = null;
}

export function toPublicCategory(row: CategoryRow): PublicCategory {
  return {
    key: row.key,
    label: row.label || row.key,
    labels: parseJson<Record<string, string>>(row.translations, {}),
    emoji: row.emoji || "✨",
    color: row.color || "fuchsia",
    subfilters: csv(row.subfilters),
    geoOnly: csv(row.geo_only),
  };
}

/** Enabled categories visible for a visitor from `geo` (GEO-restricted ones are hidden elsewhere). */
export async function visibleCategories(geo: string): Promise<PublicCategory[]> {
  const rows = await getCategoryRows();
  return rows
    .filter((r) => r.is_enabled !== "no" && r.key)
    .map(toPublicCategory)
    .filter((c) => !c.geoOnly.length || (geo && c.geoOnly.includes(geo)));
}

/** Keys of categories the visitor must not see (used to filter the catalog server-side). */
export async function hiddenCategoryKeys(geo: string): Promise<string[]> {
  const rows = await getCategoryRows();
  const visible = new Set((await visibleCategories(geo)).map((c) => c.key));
  return rows.map((r) => r.key).filter((k) => k && !visible.has(k));
}
