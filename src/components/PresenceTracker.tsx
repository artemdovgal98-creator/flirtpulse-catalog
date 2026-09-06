"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { getVisitorId } from "@/lib/visitor";
import { useI18n } from "@/lib/i18n";

const HEARTBEAT_MS = 30_000;

/**
 * Sends a lightweight presence ping so the admin dashboard can show how many
 * people are browsing right now. Mounted once in the root layout.
 */
export function PresenceTracker() {
  const pathname = usePathname();
  const { lang } = useI18n();

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      if (cancelled || typeof document === "undefined" || document.hidden) return;
      const res = await api.post("/api/track/heartbeat", {
        visitorId: getVisitorId(),
        path: pathname,
        language: lang,
      });
      if (!res.ok) console.error("[presence] heartbeat failed:", res.error);
    };

    ping();
    const timer = window.setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [pathname, lang]);

  return null;
}
