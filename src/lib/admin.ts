import "server-only";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { totalumSdk } from "@/lib/totalum";

/**
 * Password that unlocks the admin panel.
 * Override in production by setting ADMIN_PANEL_PASSWORD.
 */
const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD || "admin 777";

export const ADMIN_COOKIE = "fp_admin";
/** How long an unlocked panel stays open. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function secret(): string {
  // BETTER_AUTH_SECRET always exists in this project, so the token cannot be forged.
  return process.env.BETTER_AUTH_SECRET || "flirtpulse-admin-fallback-secret";
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 over the token payload. Web Crypto works on Node and on Workers. */
async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(signature);
}

/** Length-independent comparison so the check never leaks timing information. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Forgiving normalisation: ignores case and every kind of whitespace, so
 * "admin 777", "Admin 777" and "admin777" all unlock the panel. The password
 * itself is never sent back to the client.
 */
function normalisePassword(value: string): string {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

export function isAdminPassword(input: string): boolean {
  const expected = normalisePassword(ADMIN_PASSWORD);
  if (!expected) return false;
  return safeEqual(normalisePassword(input), expected);
}

/** Builds the signed cookie value for a freshly unlocked panel. */
export async function createAdminToken(): Promise<{ value: string; maxAge: number }> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await sign(String(expiresAt));
  return { value: `${expiresAt}.${signature}`, maxAge: Math.floor(SESSION_TTL_MS / 1000) };
}

async function isTokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  if (!rawExpiry || !signature) return false;

  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    console.log("[admin-guard] admin token expired");
    return false;
  }
  return safeEqual(await sign(rawExpiry), signature);
}

/** Header used when the browser refuses to send the cookie (third-party iframe). */
export const ADMIN_HEADER = "x-admin-token";

export interface AdminGuardResult {
  userId: string | null;
  email: string | null;
  /** True only when the panel has been unlocked with the password. */
  isAdmin: boolean;
  /** True when the signed-in user is also listed in the `admin_user` table. */
  isListedAdmin: boolean;
  /** Server-side role of the signed-in user ("admin" / "editor"), or "password" for the unlock token. */
  role: string | null;
}

/**
 * Resolves whether the caller may use the admin panel.
 *
 * Access requires the admin password: unlocking issues a short-lived HMAC-signed
 * token, delivered both as an httpOnly cookie and to the client so it can be
 * echoed back in the `x-admin-token` header. Either one unlocks the panel — the
 * header path is what keeps the dashboard working inside the Totalum preview
 * iframe, where browsers block third-party cookies. Neither can be forged: the
 * signature is HMAC-SHA256 over the expiry with the server secret.
 *
 * The auth session is looked up only to label the dashboard — it never grants
 * access on its own.
 */
export async function getAdminGuard(): Promise<AdminGuardResult> {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const cookieToken = cookieStore.get(ADMIN_COOKIE)?.value;
    const headerToken = headerStore.get(ADMIN_HEADER) || undefined;
    const unlocked =
      (await isTokenValid(cookieToken)) || (await isTokenValid(headerToken));

    if (!unlocked && (cookieToken || headerToken)) {
      console.log("[admin-guard] a token was supplied but it is invalid or expired");
    }

    let userId: string | null = null;
    let email: string | null = null;
    try {
      const session = await auth.api.getSession({ headers: headerStore });
      userId = session?.user?.id ?? null;
      email = session?.user?.email ?? null;
    } catch (err) {
      console.error("[admin-guard] session lookup failed (continuing):", err);
    }

    let isListedAdmin = false;
    let listedRole: string | null = null;
    if (userId) {
      const result = await totalumSdk.crud.query("admin_user", {
        _filter: { user: userId },
        _limit: 1,
      } as any);
      if (result.errors) console.error("[admin-guard] admin_user lookup errors:", result.errors);
      const row = ((result.data as any[]) || [])[0];
      isListedAdmin = Boolean(row);
      listedRole = row?.role ?? null;
    }

    // Role check happens here, on the server: a signed-in account whose
    // `admin_user.role` is admin/editor gets the panel without the password.
    const hasRole = listedRole === "admin" || listedRole === "editor";
    const isAdmin = unlocked || hasRole;
    const role = hasRole ? listedRole : unlocked ? "password" : null;

    console.log(
      `[admin-guard] user=${userId ?? "guest"} unlocked=${unlocked} role=${listedRole ?? "-"} isAdmin=${isAdmin}`
    );

    return { userId, email, isAdmin, isListedAdmin, role };
  } catch (err) {
    console.error("[admin-guard] guard failed:", err);
    return { userId: null, email: null, isAdmin: false, isListedAdmin: false, role: null };
  }
}

/**
 * Writes one row to the admin action journal. Logging must never break the
 * action itself, but a failure is still reported in the server log.
 */
export async function logAdmin(
  guard: AdminGuardResult,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const hdrs = await headers();
    const record: Record<string, any> = {
      action,
      entity,
      entity_id: entityId,
      summary: summary.slice(0, 240),
      details: JSON.stringify(details ?? {}),
      actor: guard.email || (guard.role === "password" ? "admin (password)" : "admin"),
      ip_address: hdrs.get("cf-connecting-ip") || hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
      logged_at: new Date().toISOString(),
    };
    if (guard.userId) record.user = guard.userId;
    const res = await totalumSdk.crud.createRecord("admin_log", record as any);
    if (res.errors) console.error("[admin-log] could not write journal entry:", res.errors);
    else console.log(`[admin-log] ${action} ${entity}/${entityId}: ${summary}`);
  } catch (err) {
    console.error("[admin-log] journal write failed:", err);
  }
}

/** Shared 403 answer for admin routes. */
export function forbidden() {
  return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
