import "server-only";
import { query, create, update, parseJson } from "@/lib/server/db";
import { hashText, translateMap, ALL_LANGS } from "@/lib/server/translate";

/**
 * Server-side helpers for the public catalog: field stripping, per-language
 * translations (cached in `offer_translation`) and click-based badges.
 */

/** Fields that must never leave the server on a public request. */
export const PRIVATE_FIELDS = [
  "slug",
  "offer_url",
  "network",
  "payout_model",
  "payout_amount",
  "payout_label",
  "epc",
  "conversion_flow",
  "affiliate_network",
  "subid_template",
  "check_result",
  "admin_edited",
] as const;

export const OMIT_PRIVATE: Record<string, true> = Object.fromEntries(PRIVATE_FIELDS.map((f) => [f, true]));

/** Language the showcase copy is written in. */
export const SOURCE_LANG = "ru";

export function stripPrivate<T extends Record<string, any>>(item: T): T {
  const safe: Record<string, any> = { ...item };
  for (const f of PRIVATE_FIELDS) delete safe[f];
  return safe as T;
}

export function offerSourceHash(o: { description?: string; tags?: string }): string {
  return hashText(`${o.description ?? ""}\u0001${o.tags ?? ""}`);
}

// ---------------------------------------------------------------- translations

const inflight = new Set<string>();

interface TranslationRow {
  _id: string;
  offer: string | { _id: string };
  language: string;
  description?: string;
  tags?: string;
  source_hash?: string;
  is_manual?: string;
}

function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

/** Translates the description + tags of several showcases into one language and caches them. */
async function translateBatch(offers: any[], lang: string, existing: Map<string, TranslationRow>) {
  const entries: Record<string, string> = {};
  for (const o of offers) {
    if (o.description) entries[`${o._id}__d`] = o.description;
    if (o.tags) entries[`${o._id}__t`] = o.tags;
  }
  if (!Object.keys(entries).length) return;
  const translated = await translateMap(entries, lang, 24);

  await Promise.all(
    offers.map(async (o) => {
      const description = translated[`${o._id}__d`] ?? "";
      const tags = translated[`${o._id}__t`] ?? "";
      if (!description && !tags) return;
      const row = existing.get(o._id);
      const data = { description, tags, source_hash: offerSourceHash(o), is_manual: "no", language: lang, offer: o._id };
      try {
        if (row) await update("offer_translation", row._id, data);
        else await create("offer_translation", data);
      } catch (err) {
        console.error(`[offer-i18n] could not store ${lang} translation of ${o._id}:`, err);
      }
    })
  );
}

/**
 * Starts translating (in the background) every showcase in `offers` whose
 * translation for `lang` is missing or stale. Concurrent requests never
 * translate the same showcase twice.
 */
export function queueTranslations(offers: any[], lang: string, existing: Map<string, TranslationRow>) {
  if (lang === SOURCE_LANG) return;
  const todo = offers.filter((o) => {
    if (!o?._id || (!o.description && !o.tags)) return false;
    const key = `${o._id}:${lang}`;
    if (inflight.has(key)) return false;
    const row = existing.get(o._id);
    if (!row) return true;
    if (row.is_manual === "yes") return false;
    return row.source_hash !== offerSourceHash(o);
  });
  if (!todo.length) return;

  for (const o of todo) inflight.add(`${o._id}:${lang}`);
  console.log(`[offer-i18n] queued ${todo.length} showcases → ${lang}`);

  (async () => {
    for (let i = 0; i < todo.length; i += 8) {
      const batch = todo.slice(i, i + 8);
      try {
        await translateBatch(batch, lang, existing);
      } catch (err) {
        console.error(`[offer-i18n] batch → ${lang} failed:`, err);
      } finally {
        for (const o of batch) inflight.delete(`${o._id}:${lang}`);
      }
    }
  })().catch((err) => console.error("[offer-i18n] queue crashed:", err));
}

/** Loads cached translations for a set of showcases in one language. */
export async function loadTranslations(ids: string[], lang: string): Promise<Map<string, TranslationRow>> {
  const map = new Map<string, TranslationRow>();
  if (!ids.length || lang === SOURCE_LANG) return map;
  const rows = await query<TranslationRow>("offer_translation", {
    _filter: { offer: { in: ids }, language: lang },
    _limit: ids.length * 2 + 10,
  });
  for (const r of rows) map.set(refId(r.offer), r);
  return map;
}

/** Applies cached translations (original text when missing) and queues the missing ones. */
export async function localizeOffers<T extends Record<string, any>>(items: T[], lang: string): Promise<T[]> {
  if (!lang || lang === SOURCE_LANG || !items.length) return items;
  try {
    const map = await loadTranslations(items.map((i) => i._id), lang);
    queueTranslations(items, lang, map);
    return items.map((item) => {
      const tr = map.get(item._id);
      if (!tr) return item;
      const fresh = tr.is_manual === "yes" || tr.source_hash === offerSourceHash(item);
      if (!fresh) return item;
      return {
        ...item,
        description: tr.description || item.description,
        tags: tr.tags || item.tags,
        original_description: item.description,
      };
    });
  } catch (err) {
    console.error(`[offer-i18n] localisation to ${lang} failed — showing originals:`, err);
    return items;
  }
}

/** Called after an admin save: re-translates the showcase into every language. */
export function retranslateOffer(offer: any) {
  if (!offer?._id) return;
  (async () => {
    const rows = await query<TranslationRow>("offer_translation", { _filter: { offer: offer._id }, _limit: 50 });
    for (const lang of ALL_LANGS) {
      if (lang === SOURCE_LANG) continue;
      const existing = new Map<string, TranslationRow>();
      const row = rows.find((r) => r.language === lang);
      if (row) existing.set(offer._id, row);
      queueTranslations([offer], lang, existing);
    }
  })().catch((err) => console.error("[offer-i18n] retranslate failed:", err));
}

// ---------------------------------------------------------------- badges

export interface BadgeInfo {
  badges: string[];
  clicks7d: number;
  clicks24h: number;
}

let badgeCache: { at: number; map: Map<string, BadgeInfo> } | null = null;
const BADGE_TTL = 60_000;

/** Thresholds — badges only appear when real click volume backs them up. */
const HIT_MIN_CLICKS = 3;
const TRENDING_MIN_CLICKS = 2;
const TOP_N = 6;
const NEW_DAYS = 14;

async function clicksByOffer(sinceIso: string): Promise<Map<string, number>> {
  const rows = await query<any>("click", {
    _filter: { clicked_at: { gte: sinceIso } },
    _groupBy: "offer",
    _aggregate: { _count: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    const id = refId(r?._group?.offer);
    if (id) map.set(id, Number(r?._aggregate?._count) || 0);
  }
  return map;
}

/** Click-based badges, recomputed at most once a minute. */
export async function getBadgeMap(): Promise<Map<string, BadgeInfo>> {
  if (badgeCache && Date.now() - badgeCache.at < BADGE_TTL) return badgeCache.map;
  const now = Date.now();
  const [week, day] = await Promise.all([
    clicksByOffer(new Date(now - 7 * 86400_000).toISOString()),
    clicksByOffer(new Date(now - 86400_000).toISOString()),
  ]);

  const map = new Map<string, BadgeInfo>();
  const get = (id: string) => {
    if (!map.has(id)) map.set(id, { badges: [], clicks7d: week.get(id) ?? 0, clicks24h: day.get(id) ?? 0 });
    return map.get(id)!;
  };

  [...week.entries()]
    .filter(([, n]) => n >= HIT_MIN_CLICKS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .forEach(([id]) => get(id).badges.push("hit_week"));

  [...day.entries()]
    .filter(([, n]) => n >= TRENDING_MIN_CLICKS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .forEach(([id]) => get(id).badges.push("trending"));

  for (const id of week.keys()) get(id);
  badgeCache = { at: now, map };
  console.log(`[badges] recomputed: ${map.size} showcases with clicks in 7 days`);
  return map;
}

export function isNewOffer(o: { published_at?: string; launch_date?: string; createdAt?: string; is_custom?: string }): boolean {
  const ref = o.published_at || (o.is_custom === "yes" ? o.createdAt : o.launch_date) || "";
  if (!ref) return false;
  return Date.now() - new Date(ref).getTime() < NEW_DAYS * 86400_000;
}

let networkCache: { at: number; map: Map<string, string> } | null = null;

/** affiliate_network id → slug, cached for a minute. */
export async function getNetworkSlugs(): Promise<Map<string, string>> {
  if (networkCache && Date.now() - networkCache.at < 60_000) return networkCache.map;
  const rows = await query<any>("affiliate_network", { _select: { slug: true, name: true }, _limit: 500 });
  const map = new Map<string, string>();
  for (const r of rows) map.set(r._id, r.slug || slugifyNetwork(r.name || "direct"));
  networkCache = { at: Date.now(), map };
  return map;
}

export function invalidateNetworkSlugs() {
  networkCache = null;
}

export function slugifyNetwork(name: string): string {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "direct"
  );
}

/** Builds the public tracking path /go/{category}/{network}/{showcase}. */
export function buildGoPath(item: any, networks: Map<string, string>): string {
  const category = (item.category ?? [])[0] || "catalog";
  const netId = refId(item.affiliate_network);
  const network = (netId && networks.get(netId)) || "direct";
  return `/go/${encodeURIComponent(category)}/${encodeURIComponent(network)}/${item._id}`;
}

/** Strips private fields, localises the copy and attaches the badges. */
export async function decorateOffers(items: any[], lang: string): Promise<any[]> {
  const networks = await getNetworkSlugs().catch((err) => {
    console.error("[offers] network slugs unavailable:", err);
    return new Map<string, string>();
  });
  const safe = items.map((item) => ({ ...stripPrivate(item), go_path: buildGoPath(item, networks) }));
  const [localized, badges] = await Promise.all([
    localizeOffers(safe, lang),
    getBadgeMap().catch((err) => {
      console.error("[badges] could not compute badges:", err);
      return new Map<string, BadgeInfo>();
    }),
  ]);
  return localized.map((o) => {
    const info = badges.get(o._id);
    const list = [...(info?.badges ?? [])];
    if (isNewOffer(o)) list.unshift("new");
    return { ...o, badges: list, clicks_7d: info?.clicks7d ?? 0 };
  });
}

export { parseJson };

/** `_omit` for public queries — keeps `affiliate_network` so the /go path can be built, then strips it. */
export const OMIT_FOR_QUERY: Record<string, true> = Object.fromEntries(
  PRIVATE_FIELDS.filter((f) => f !== "affiliate_network").map((f) => [f, true])
);
