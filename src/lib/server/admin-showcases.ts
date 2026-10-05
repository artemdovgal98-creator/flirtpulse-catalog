import "server-only";
import { query, update } from "@/lib/server/db";
import { buildDestination, domainOf } from "@/lib/server/tracking";
import { normaliseTrackingUrl } from "@/lib/showcase";
import type { AdminGuardResult } from "@/lib/admin";

/**
 * Admin-only showcase helpers: pre-publish checks, per-offer performance and
 * role checks. Owned by the admin panel (ADMIN-A).
 */

/** Destructive / settings actions: full admins and the password session, never editors. */
export function canManage(guard: AdminGuardResult): boolean {
  return guard.isAdmin && (guard.role === "admin" || guard.role === "password");
}

export function managerOnly() {
  return Response.json({ ok: false, error: "ADMIN_ROLE_REQUIRED" }, { status: 403 });
}

export function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

// ---------------------------------------------------------------- checks

export interface CheckItem {
  key: "link_format" | "link_reachable" | "duplicate" | "image" | "category" | "geo";
  ok: boolean;
  /** Hard checks block publishing; warnings never do. */
  level: "error" | "warning";
  message: string;
  details?: Record<string, any>;
}

export interface CheckResult {
  ok: boolean;
  checks: CheckItem[];
  checked_at: string;
}

const TEST_VARS = {
  click_id: "fpcheck0000",
  subid: "check",
  category: "check",
  geo: "us",
  offer_id: "check",
  network: "direct",
  lang: "en",
};

/** HEAD (then GET) with a 6 s timeout; follows redirects. 2xx/3xx = reachable. */
export async function checkReachable(rawUrl: string): Promise<{ ok: boolean; status?: number; message: string; finalUrl?: string }> {
  const filled = buildDestination(rawUrl, "", TEST_VARS) || rawUrl;
  const attempt = async (method: "HEAD" | "GET") => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(filled, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
      // Release the body: only the status matters.
      res.body?.cancel().catch(() => undefined);
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res = await attempt("HEAD");
    if (res.status >= 400) res = await attempt("GET");
    const ok = res.status >= 200 && res.status < 400;
    console.log(`[showcase-check] ${domainOf(filled)} answered ${res.status}`);
    return {
      ok,
      status: res.status,
      finalUrl: res.url,
      message: ok ? `HTTP ${res.status}` : `HTTP ${res.status} — the link answers with an error`,
    };
  } catch (err: any) {
    const timeout = err?.name === "AbortError";
    console.error(`[showcase-check] ${domainOf(filled)} unreachable:`, err?.message || err);
    return { ok: false, message: timeout ? "No answer within 6 seconds" : err?.message || "Request failed" };
  }
}

/** Strips placeholder/tracking noise so two links to the same landing compare equal. */
function linkFingerprint(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const params = [...u.searchParams.entries()]
      .filter(([, v]) => !/\{[^}]*\}?/.test(v))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "")}?${params}`;
  } catch {
    return url;
  }
}

/** Non-archived showcases whose link points at the same domain (and the exact-link subset). */
export async function findDuplicates(url: string, excludeId?: string) {
  const domain = domainOf(url);
  if (!domain) return { domain, sameDomain: [] as any[], sameLink: [] as any[] };
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await query<any>("offer", {
    _filter: { offer_url: { regex: escaped, options: "i" }, status: { ne: "archived" } },
    _select: { name: true, offer_url: true, status: true },
    _limit: 500,
  });
  const fp = linkFingerprint(url);
  const sameDomain = rows.filter((r) => r._id !== excludeId && domainOf(r.offer_url || "") === domain);
  const sameLink = sameDomain.filter((r) => linkFingerprint(r.offer_url || "") === fp);
  return {
    domain,
    sameDomain: sameDomain.map((r) => ({ _id: r._id, name: r.name, status: r.status })),
    sameLink: sameLink.map((r) => ({ _id: r._id, name: r.name, status: r.status })),
  };
}

/**
 * Link-only checks used by the form's "Check link" button and by the full check.
 * The duplicate check is HARD only for the very same landing (same domain + path +
 * fixed parameters). Sharing the domain alone is a warning: affiliate networks use
 * one tracking domain for hundreds of different offers.
 */
export async function runLinkChecks(rawUrl: string, excludeId?: string, opts: { reachability?: boolean } = {}) {
  const checks: CheckItem[] = [];
  const format = normaliseTrackingUrl(rawUrl || "");
  const url = "url" in format ? format.url : "";
  const formatOk = Boolean(url);
  checks.push({
    key: "link_format",
    ok: formatOk,
    level: "error",
    message: formatOk ? "Valid http(s) link" : "error" in format ? format.error : "Tracking link is empty",
  });
  if (!formatOk) return { url, checks };

  const [dups, reach] = await Promise.all([
    findDuplicates(url, excludeId),
    opts.reachability === false ? Promise.resolve(null) : checkReachable(url),
  ]);

  if (dups.sameLink.length) {
    checks.push({
      key: "duplicate",
      ok: false,
      level: "error",
      message: `The same link is already used by: ${dups.sameLink.map((d) => d.name).slice(0, 3).join(", ")}`,
      details: { duplicates: dups.sameLink.slice(0, 10), domain: dups.domain },
    });
  } else {
    checks.push({
      key: "duplicate",
      ok: true,
      level: dups.sameDomain.length ? "warning" : "error",
      message: dups.sameDomain.length
        ? `${dups.sameDomain.length} other showcase(s) use the domain ${dups.domain}`
        : "No duplicates",
      details: dups.sameDomain.length
        ? { sameDomain: dups.sameDomain.slice(0, 10), domain: dups.domain }
        : { domain: dups.domain },
    });
  }

  if (reach) {
    checks.push({
      key: "link_reachable",
      ok: reach.ok,
      level: "warning",
      message: reach.message,
      details: { status: reach.status ?? null },
    });
  }
  return { url, checks };
}

/** Full pre-publish check of a stored (or about-to-be-stored) showcase. */
export async function runShowcaseChecks(
  offer: Record<string, any>,
  opts: { reachability?: boolean } = {}
): Promise<CheckResult> {
  const { checks } = await runLinkChecks(offer.offer_url || "", offer._id, opts);

  const images = Array.isArray(offer.images) ? offer.images.filter((f: any) => f?.name) : [];
  const hasImage = images.length > 0 || Boolean(String(offer.image_url || "").trim());
  checks.push({
    key: "image",
    ok: hasImage,
    level: "error",
    message: hasImage ? `${images.length || 1} image(s)` : "Upload at least one image",
  });

  const categories = Array.isArray(offer.category) ? offer.category.filter(Boolean) : [];
  checks.push({
    key: "category",
    ok: categories.length > 0,
    level: "error",
    message: categories.length ? categories.join(", ") : "Choose a category",
  });

  const geos = Array.isArray(offer.geo) ? offer.geo.filter(Boolean) : [];
  checks.push({
    key: "geo",
    ok: geos.length > 0,
    level: "error",
    message: geos.length ? geos.join(", ").toUpperCase() : "Choose at least one GEO",
  });

  const ok = checks.every((c) => c.ok || c.level === "warning");
  return { ok, checks, checked_at: new Date().toISOString() };
}

export function failedHardChecks(result: CheckResult): string[] {
  return result.checks.filter((c) => !c.ok && c.level === "error").map((c) => c.key);
}

/** Runs the checks and stores them on the offer (`check_result`, long-string JSON). */
export async function checkAndStore(offer: Record<string, any>, opts: { reachability?: boolean } = {}) {
  const result = await runShowcaseChecks(offer, opts);
  if (offer._id) await update("offer", offer._id, { check_result: JSON.stringify(result) });
  console.log(
    `[showcase-check] ${offer._id ?? "new"} "${offer.name}" ok=${result.ok} failed=[${failedHardChecks(result).join(",")}]`
  );
  return result;
}

// ---------------------------------------------------------------- performance

export interface OfferStats {
  clicks: number;
  conversions: number;
  approved: number;
  revenue: number;
  pending_revenue: number;
  cr: number;
  epc: number;
}

function groups(rows: any[]): any[] {
  return Array.isArray(rows) ? rows : [];
}

/** Clicks / conversions / revenue per offer, computed with Totalum _groupBy aggregates. */
export async function getOfferStatsMap(): Promise<Map<string, OfferStats>> {
  const [clickGroups, convGroups] = await Promise.all([
    query<any>("click", { _groupBy: "offer", _aggregate: { _count: true }, _limit: 10000 }),
    query<any>("conversion", {
      _groupBy: ["offer", "status"],
      _aggregate: { _count: true, _sum: { payout: true } },
      _limit: 10000,
    }),
  ]);
  const map = new Map<string, OfferStats>();
  const get = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = { clicks: 0, conversions: 0, approved: 0, revenue: 0, pending_revenue: 0, cr: 0, epc: 0 };
      map.set(id, s);
    }
    return s;
  };
  for (const g of groups(clickGroups)) {
    const id = refId(g?._group?.offer);
    if (id) get(id).clicks += Number(g?._aggregate?._count ?? 0);
  }
  for (const g of groups(convGroups)) {
    const id = refId(g?._group?.offer);
    if (!id) continue;
    const s = get(id);
    const n = Number(g?._aggregate?._count ?? 0);
    const sum = Number(g?._aggregate?._sum?.payout ?? 0) || 0;
    const status = g?._group?.status;
    s.conversions += n;
    if (status === "approved") {
      s.approved += n;
      s.revenue += sum;
    } else if (status === "pending" || status === "pending_pricing") {
      s.pending_revenue += sum;
    }
  }
  for (const s of map.values()) {
    s.revenue = Math.round(s.revenue * 100) / 100;
    s.pending_revenue = Math.round(s.pending_revenue * 100) / 100;
    s.cr = s.clicks ? Math.round((s.approved / s.clicks) * 10000) / 100 : 0;
    s.epc = s.clicks ? Math.round((s.revenue / s.clicks) * 10000) / 10000 : 0;
  }
  return map;
}

export const EMPTY_STATS: OfferStats = {
  clicks: 0,
  conversions: 0,
  approved: 0,
  revenue: 0,
  pending_revenue: 0,
  cr: 0,
  epc: 0,
};


/** Public origin of the request (honours the Totalum / Cloudflare proxy headers). */
export function requestOrigin(request: Request, hdrs?: Headers): string {
  const h = hdrs ?? request.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim();
  if (host && !/^(localhost|127\.|0\.0\.0\.0)/.test(host)) return `${proto || "https"}://${host}`;
  return new URL(request.url).origin;
}

export interface StatusChange {
  patch: Record<string, any>;
  /** True when publishing was requested but a hard check failed. */
  blocked: boolean;
  check: CheckResult | null;
  /** True on the very first publication (published_at was empty) → announce it. */
  announce: boolean;
}

/**
 * Computes the DB patch for a status change of a showcase.
 * `merged` = the offer as it will look after the save (used for the checks).
 * Publishing (→ active) runs the pre-publish checks and is refused when a hard check fails.
 */
export async function statusChange(
  existing: Record<string, any>,
  merged: Record<string, any>,
  next: string,
  opts: { reachability?: boolean } = {}
): Promise<StatusChange> {
  const now = new Date().toISOString();
  if (!next || next === existing.status) return { patch: {}, blocked: false, check: null, announce: false };

  if (next === "active") {
    const check = await checkAndStore({ ...merged, _id: existing._id }, opts);
    if (!check.ok) return { patch: {}, blocked: true, check, announce: false };
    const patch: Record<string, any> = { status: "active" };
    const announce = !existing.published_at;
    if (announce) patch.published_at = now;
    if (existing.archived_at) patch.archived_at = null;
    return { patch, blocked: false, check, announce };
  }
  if (next === "archived") return { patch: { status: "archived", archived_at: now }, blocked: false, check: null, announce: false };

  const patch: Record<string, any> = { status: next };
  if (existing.status === "archived") patch.archived_at = null;
  return { patch, blocked: false, check: null, announce: false };
}
