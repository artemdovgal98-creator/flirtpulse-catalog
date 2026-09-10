"use client";

/**
 * Typed client-side fetch service.
 *
 * All client components MUST use these helpers instead of raw `fetch()`
 * so every call/response follows the same `{ ok, data?, error? }` shape.
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  total?: number;
  error?: any;
}

/**
 * Admin unlock token mirror.
 *
 * The real credential is the httpOnly `fp_admin` cookie. When the app runs
 * inside the Totalum preview iframe (a third-party context) the browser can
 * refuse to send that cookie, and every /api/admin call used to answer
 * "Forbidden". The same signed token is therefore also kept in localStorage and
 * sent as `x-admin-token`; the server accepts either one.
 */
export const ADMIN_TOKEN_KEY = "fp_admin_token";

export function getAdminToken(): string {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token: string) {
  try {
    if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (err) {
    console.error("[api] could not persist the admin token:", err);
  }
}

function withDefaults(url: string, options?: RequestInit): RequestInit {
  const headers = new Headers(options?.headers);

  if (url.startsWith("/api/admin")) {
    const token = getAdminToken();
    if (token) headers.set("x-admin-token", token);
  }

  return {
    ...options,
    headers,
    // Always hit the server: the catalog and the dashboard must never render
    // a stale bfcache/HTTP-cache copy after an admin change.
    cache: "no-store",
    credentials: "include",
  };
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, withDefaults(url, options));
    const json = (await res.json()) as ApiResponse<T>;
    return json;
  } catch (err) {
    console.error(`[api] ${url} failed:`, err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const api = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url);
  },

  post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  put<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },

  delete<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "DELETE" });
  },

  /**
   * Multipart upload. The browser sets the multipart boundary itself, so no
   * Content-Type header must be provided here.
   */
  upload<T>(url: string, form: FormData): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "POST", body: form });
  },
};
