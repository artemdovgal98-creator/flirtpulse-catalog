"use client";

/**
 * Registers /sw.js (scope "/") and tells the worker the visitor's language, so
 * a payload-less push can fetch the newest notification in that language.
 */

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export function PwaRegister() {
  const { lang } = useI18n();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (cancelled) return;
        reg.active?.postMessage({ type: "fp-lang", lang });
        console.log(`[pwa] service worker ready (lang=${lang})`);
      })
      .catch((err) => console.error("[pwa] service worker registration failed:", err));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return null;
}
