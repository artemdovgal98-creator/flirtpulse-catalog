import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query, create } from "@/lib/server/db";
import { OMIT_FOR_QUERY } from "@/lib/server/offers";
import { hiddenCategoryKeys } from "@/lib/server/categories";
import { LANGUAGES } from "@/lib/languages";

/** Server helpers shared by the ENGAGE API routes (quiz, for-you, compare, reviews, collections, referral…). */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return null;
    return { id: session.user.id, name: session.user.name || "", email: session.user.email || "" };
  } catch (err) {
    console.error("[engage] session lookup failed:", err);
    return null;
  }
}

export function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

const LANG_CODES = new Set<string>(LANGUAGES.map((l) => l.code));

export function safeLang(lang: unknown): string {
  const l = String(lang || "").toLowerCase();
  return LANG_CODES.has(l) ? l : "ru";
}

export function cleanIds(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((v) => String(v ?? "").trim()).filter((v) => /^[a-f0-9]{24}$/i.test(v)))
  ).slice(0, max);
}

/** Fields the scoring code never needs — keeps the "all active offers" query light. */
const SCORING_OMIT: Record<string, true> = { ...OMIT_FOR_QUERY, description: true };

let activeCache: { at: number; rows: any[] } | null = null;

/** Every published showcase (light fields), cached for 60 s. */
export async function getActiveOffersLight(): Promise<any[]> {
  if (activeCache && Date.now() - activeCache.at < 60_000) return activeCache.rows;
  const rows: any[] = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const page = await query<any>("offer", {
      _filter: { status: "active" },
      _omit: SCORING_OMIT,
      _limit: 1000,
      _offset: offset,
    });
    rows.push(...page);
    if (page.length < 1000) break;
  }
  activeCache = { at: Date.now(), rows };
  console.log(`[engage] cached ${rows.length} active showcases for scoring`);
  return rows;
}

/** Active showcases visible for this GEO (GEO-restricted categories removed). */
export async function getVisibleOffers(geo: string): Promise<any[]> {
  const [rows, hidden] = await Promise.all([getActiveOffersLight(), hiddenCategoryKeys(geo)]);
  if (!hidden.length) return rows;
  const h = new Set(hidden);
  return rows.filter((o) => {
    const cats: string[] = o.category ?? [];
    return !cats.length || cats.some((c) => !h.has(c));
  });
}

/** Loads full public rows (with description) for the given ids, preserving the order of `ids`. */
export async function loadOffersByIds(ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  const rows = await query<any>("offer", {
    _filter: { _id: { in: ids }, status: "active" },
    _omit: OMIT_FOR_QUERY,
    _limit: ids.length,
  });
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/** Is the showcase available in this country? Empty GEO list or "worldwide" = everywhere. */
export function availableIn(offer: any, country: string): "exact" | "worldwide" | "no" {
  const geos: string[] = (offer.geo ?? []).map((g: string) => String(g).toLowerCase());
  if (country && geos.includes(country)) return "exact";
  if (!geos.length || geos.includes("worldwide") || geos.includes("all")) return "worldwide";
  return country ? "no" : "worldwide";
}

/** Approved 👍/👎 counts per showcase. */
export async function reviewCounts(offerIds: string[]): Promise<Map<string, { up: number; down: number }>> {
  const map = new Map<string, { up: number; down: number }>();
  for (const id of offerIds) map.set(id, { up: 0, down: 0 });
  if (!offerIds.length) return map;
  const rows = await query<any>("review", {
    _filter: { offer: { in: offerIds }, status: "approved" },
    _groupBy: ["offer", "vote"],
    _aggregate: { _count: true },
  });
  for (const r of rows) {
    const id = refId(r?._group?.offer);
    const vote = r?._group?.vote;
    const n = Number(r?._aggregate?._count) || 0;
    const entry = map.get(id);
    if (!entry) continue;
    if (vote === "up") entry.up += n;
    else if (vote === "down") entry.down += n;
  }
  return map;
}

export function requestOrigin(req: Request, h: Headers): string {
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    return `${proto.split(",")[0]}://${host.split(",")[0]}`;
  }
  return new URL(req.url).origin;
}

export function jsonError(message: string, status = 500) {
  return Response.json({ ok: false, error: message }, { status });
}

/** The user's `user_preference` row, created on demand. */
export async function getOrCreatePreference(userId: string): Promise<any> {
  const rows = await query<any>("user_preference", { _filter: { user: userId }, _limit: 1 });
  if (rows[0]) return rows[0];
  const id = await create("user_preference", { user: userId, language: "ru" });
  console.log(`[engage] created user_preference ${id} for user ${userId}`);
  return { _id: id, user: userId, language: "ru" };
}
