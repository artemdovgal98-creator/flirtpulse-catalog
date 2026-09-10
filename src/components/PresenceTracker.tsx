"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getVisitorId } from "@/lib/visitor";
import { useI18n } from "@/lib/i18n";

const HEARTBEAT_MS = 30_000;
/** After this many consecutive failures the tracker stops logging every retry. */
const QUIET_AFTER = 3;

/**
 * Sends a lightweight presence ping so the admin dashboard can show how many
 * people are browsing right now. Mounted once in the root layout.
 *
 * While the tab is hidden — or while the sandbox is suspended and the request
 * fails — the ping backs off instead of retrying at full rate and filling the
 * console with warnings. It resumes immediately when the tab becomes visible.
 */
export function PresenceTracker() {
  const pathname = usePathname();
  const { lang } = useI18n();

  useEffect(() => {
    let cancelled = false;
    let failures = 0;

    const ping = async () => {
      if (cancelled || typeof document === "undefined" || document.hidden) return;

      // Exponential-ish skip: 1 in 2 pings after 3 failures, 1 in 4 after 6.
      if (failures >= QUIET_AFTER && Math.random() > 1 / Math.min(8, failures - 1)) return;

      const res = await api.post("/api/track/heartbeat", {
        visitorId: getVisitorId(),
        path: pathname,
        language: lang,
      });

      if (res.ok) {
        if (failures) console.log("[presence] heartbeat recovered after", failures, "failure(s)");
        failures = 0;
        return;
      }

      failures += 1;
      if (failures <= QUIET_AFTER) console.error("[presence] heartbeat failed:", res.error);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Coming back from a suspended sandbox — retry straight away.
      failures = 0;
      ping();
    };

    ping();
    const timer = window.setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname, lang]);

  return null;
}
