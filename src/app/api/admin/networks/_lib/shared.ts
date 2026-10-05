import "server-only";
import { NextResponse } from "next/server";

/**
 * Small helpers shared by the ADMIN-B routes (networks, ads, ticker,
 * notifications, reviews, translations). The `_lib` folder is private to the
 * App Router, so nothing here is exposed as a route.
 */

export function okJson(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function errJson(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Logs the failure with its route label and returns it to the client. */
export function serverError(label: string, err: unknown) {
  console.error(`[API ERROR] ${label}`, err);
  const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
  return NextResponse.json({ ok: false, error: message || "Unknown error" }, { status: 500 });
}

/** Public origin of the site, honouring the proxy headers set by Totalum / Cloudflare. */
export function getOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? url.protocol.replace(":", "") : "https");
  return `${proto}://${host.split(",")[0].trim()}`;
}

/** Accepts "", null, a date-time string or a Date; returns ISO or null. */
export function toIsoOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function yesNo(value: unknown, fallback: "yes" | "no" = "yes"): "yes" | "no" {
  if (value === true || value === "yes") return "yes";
  if (value === false || value === "no") return "no";
  return fallback;
}

export function str(value: unknown, max = 5000): string {
  return String(value ?? "").trim().slice(0, max);
}

/** Normalises a comma separated list ("de, AT ,ua" → "DE,AT,UA" when `upper`). */
export function csvField(value: unknown, upper = false): string {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  const parts = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => (upper ? v.toUpperCase() : v.toLowerCase()));
  return Array.from(new Set(parts)).join(",");
}

export function refId(v: any): string {
  return typeof v === "string" ? v : v?._id ?? "";
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Translation maps are stored as JSON; keep only non-empty string values. */
export function cleanMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}
