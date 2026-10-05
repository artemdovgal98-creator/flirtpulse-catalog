import "server-only";
import { query, create, update } from "@/lib/server/db";

/**
 * Key/value settings stored in `app_setting`.
 * Keys listed in SECRET_SETTINGS are never returned to the browser unmasked.
 */
export const SECRET_SETTINGS = ["telegram_bot_token", "vapid_private_jwk"] as const;

export const PUBLIC_SETTINGS = ["telegram_channel_url", "catalog_ad_every", "push_enabled"] as const;

let cache: { at: number; values: Record<string, string> } | null = null;
const TTL = 30_000;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.values;
  const rows = await query<{ key: string; value?: string }>("app_setting", { _limit: 500 });
  const values: Record<string, string> = {};
  for (const r of rows) if (r.key) values[r.key] = r.value ?? "";
  cache = { at: Date.now(), values };
  return values;
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const all = await loadAll();
  return all[key] ?? fallback;
}

export async function getSettings(): Promise<Record<string, string>> {
  return { ...(await loadAll()) };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const rows = await query<{ _id: string }>("app_setting", { _filter: { key }, _limit: 1 });
  if (rows[0]) await update("app_setting", rows[0]._id, { value });
  else await create("app_setting", { key, value });
  cache = null;
  console.log(`[settings] saved "${key}"${(SECRET_SETTINGS as readonly string[]).includes(key) ? " (secret)" : ""}`);
}
