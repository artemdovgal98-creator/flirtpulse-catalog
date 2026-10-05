import "server-only";
import { query, mask } from "@/lib/server/db";
import { slugifyNetwork } from "@/lib/server/offers";

/** Raw `affiliate_network` row as stored in Totalum. */
export interface NetworkRow {
  _id: string;
  name?: string;
  slug?: string;
  link_template?: string | null;
  postback_secret?: string | null;
  api_url?: string | null;
  api_key?: string | null;
  geo?: string | null;
  payout_model?: string | null;
  status?: string | null;
  notes?: string | null;
  last_test_at?: string | null;
  last_test_result?: string | null;
  createdAt?: string;
}

export const NETWORK_STATUSES = ["pending", "connected", "error"] as const;

export function postbackUrl(origin: string, slug: string, secret: string): string {
  return (
    `${origin}/api/postback/${encodeURIComponent(slug)}?secret=${secret}` +
    `&click_id={click_id}&transaction_id={transaction_id}&payout={payout}&currency={currency}&status={status}`
  );
}

/**
 * Safe client view: the API key and the postback secret are never included —
 * only masked previews and "is set" flags.
 */
export function toClient(row: NetworkRow, origin: string, offers = 0, conversions = 0) {
  const slug = row.slug || slugifyNetwork(row.name || "network");
  const secret = row.postback_secret || "";
  return {
    _id: row._id,
    name: row.name ?? "",
    slug,
    link_template: row.link_template ?? "",
    api_url: row.api_url ?? "",
    api_key_masked: mask(row.api_key),
    has_api_key: Boolean(row.api_key),
    has_secret: Boolean(secret),
    postback_url_masked: secret ? postbackUrl(origin, slug, mask(secret)) : "",
    geo: row.geo ?? "",
    payout_model: row.payout_model ?? "",
    status: row.status || "pending",
    notes: row.notes ?? "",
    last_test_at: row.last_test_at ?? null,
    last_test_result: row.last_test_result ?? "",
    offers,
    conversions,
  };
}

/** Returns a slug derived from `base` that no other network uses. */
export async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugifyNetwork(base || "network");
  const rows = await query<NetworkRow>("affiliate_network", { _select: { slug: true }, _limit: 1000 });
  const taken = new Set(rows.filter((r) => r._id !== exceptId).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Counts rows of `table` per affiliate_network id. */
export async function countByNetwork(table: "offer" | "conversion"): Promise<Map<string, number>> {
  const rows = await query<any>(table, { _groupBy: "affiliate_network", _aggregate: { _count: true } });
  const map = new Map<string, number>();
  for (const r of rows) {
    const g = r?._group?.affiliate_network;
    const id = typeof g === "string" ? g : g?._id;
    if (id) map.set(id, Number(r?._aggregate?._count) || 0);
  }
  return map;
}
