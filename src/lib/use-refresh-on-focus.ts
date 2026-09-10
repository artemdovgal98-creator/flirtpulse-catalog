"use client";

import { useEffect, useRef } from "react";

/**
 * Re-runs `refresh` whenever the tab becomes visible or the window regains focus.
 *
 * The sandbox that serves this app suspends itself while nobody is browsing.
 * When the visitor comes back, whatever the page fetched before the pause is
 * stale (and may have failed outright while the server was waking up), so the
 * client re-syncs with the server instead of showing frozen numbers.
 *
 * Calls are throttled so an alt-tab burst cannot hammer the API.
 */
export function useRefreshOnFocus(refresh: () => void, throttleMs = 10_000) {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    let lastRun = Date.now();

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRun < throttleMs) return;
      lastRun = now;
      console.log("[sync] tab is active again — refreshing data from the server");
      latest.current();
    };

    document.addEventListener("visibilitychange", maybeRefresh);
    window.addEventListener("focus", maybeRefresh);
    window.addEventListener("online", maybeRefresh);

    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh);
      window.removeEventListener("focus", maybeRefresh);
      window.removeEventListener("online", maybeRefresh);
    };
  }, [throttleMs]);
}
