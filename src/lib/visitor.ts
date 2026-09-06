"use client";

const STORAGE_KEY = "flirtpulse.visitor";

/**
 * Stable per-browser id used for presence ("online now") and click attribution.
 * It is a random opaque string — no personal data is involved.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `v_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      window.localStorage.setItem(STORAGE_KEY, id);
      console.log("[visitor] created new visitor id:", id);
    }
    return id;
  } catch (err) {
    console.error("[visitor] localStorage unavailable:", err);
    return "anonymous";
  }
}
