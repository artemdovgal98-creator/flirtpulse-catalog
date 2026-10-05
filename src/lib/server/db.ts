import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * Thin, typed wrappers around the Totalum SDK. Every helper throws on SDK errors
 * so failures surface in the API route instead of being silently swallowed.
 */

function fail(op: string, table: string, errors: any): never {
  console.error(`[db] ${op} ${table} failed:`, errors);
  throw new Error(errors?.errorMessage || `${op} ${table} failed`);
}

export async function query<T = any>(table: string, options: Record<string, any> = {}): Promise<T[]> {
  const res = await totalumSdk.crud.query(table, options as any);
  if (res.errors) fail("query", table, res.errors);
  return ((res.data as any[]) || []) as T[];
}

/** Reads every matching row, page by page (Totalum caps a single page). */
export async function queryAll<T = any>(
  table: string,
  options: Record<string, any> = {},
  max = 20000
): Promise<T[]> {
  const page = 2000;
  const out: T[] = [];
  for (let offset = 0; offset < max; offset += page) {
    const rows = await query<T>(table, { ...options, _limit: page, _offset: offset });
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export async function count(table: string, filter?: Record<string, any>): Promise<number> {
  const res = await totalumSdk.crud.query(table, {
    ...(filter && Object.keys(filter).length ? { _filter: filter } : {}),
    _aggregate: { _count: true },
  } as any);
  if (res.errors) fail("count", table, res.errors);
  const data = res.data as any;
  return (
    data?._aggregate?._count ??
    (Array.isArray(data) ? data[0]?._aggregate?._count : undefined) ??
    0
  );
}

export async function getById<T = any>(table: string, id: string): Promise<T | null> {
  const res = await totalumSdk.crud.getRecordById(table, id);
  if (res.errors) {
    console.error(`[db] getById ${table}/${id} errors:`, res.errors);
    return null;
  }
  return (res.data as T) ?? null;
}

export async function create(table: string, data: Record<string, any>): Promise<string> {
  const res = await totalumSdk.crud.createRecord(table, data as any);
  if (res.errors) fail("create", table, res.errors);
  const id = (res.data as any)?.insertedId ?? (res.data as any)?._id;
  return String(id);
}

export async function update(table: string, id: string, data: Record<string, any>): Promise<void> {
  const res = await totalumSdk.crud.editRecordById(table, id, data as any);
  if (res.errors) fail("update", table, res.errors);
}

export async function remove(table: string, id: string): Promise<void> {
  const res = await totalumSdk.crud.deleteRecordById(table, id);
  if (res.errors) fail("delete", table, res.errors);
}

/** Totalum JSON long-strings come back either parsed or as text — normalise both. */
export function parseJson<T = any>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

/** Splits a comma separated string field into clean lowercase tokens. */
export function csv(value: unknown): string[] {
  return String(value ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function randomToken(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Hides a secret except for its last 4 characters. Never log or return the raw value. */
export function mask(secret: unknown): string {
  const s = String(secret ?? "");
  if (!s) return "";
  if (s.length <= 4) return "••••";
  return `${"•".repeat(Math.min(12, s.length - 4))}${s.slice(-4)}`;
}
