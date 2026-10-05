"use client";

/**
 * 18+ confirmation. The page content is always rendered underneath (crawlers
 * get the full HTML); the modal only appears on the client after hydration
 * when the visitor has not confirmed yet. Ads wait for `useAgeConfirmed()`.
 */

import React, { useEffect, useSyncExternalStore } from "react";
import { ShieldAlert, LogOut, Check, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const KEY = "flirtpulse_age_ok";
const EVENT = "fp-age";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** "yes" | "no" on the client, "unknown" during SSR / hydration. */
function useAgeState(): "yes" | "no" | "unknown" {
  return useSyncExternalStore(
    subscribe,
    () => (read() ? "yes" : "no"),
    () => "unknown"
  );
}

/** True once the visitor confirmed being 18+ on this device. */
export function useAgeConfirmed(): boolean {
  return useAgeState() === "yes";
}

function confirmAge() {
  try {
    window.localStorage.setItem(KEY, "yes");
  } catch (err) {
    console.error("[age-gate] could not persist confirmation:", err);
  }
  console.log("[age-gate] visitor confirmed 18+");
  window.dispatchEvent(new Event(EVENT));
}

export function AgeGate() {
  const { t } = useI18n();
  const state = useAgeState();
  const open = state === "no";

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fp-age-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b0716]/80 p-5 backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-fuchsia-600/30 blur-[110px]" />
      <div className="fp-rise fp-card relative w-full max-w-sm overflow-hidden rounded-[2rem] p-7 text-center shadow-[0_40px_120px_-40px_rgba(217,70,239,0.9)]">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_26px_-4px_rgba(217,70,239,0.9)]">
            <Heart className="fp-heart h-5 w-5 fill-white text-white" strokeWidth={2.4} />
          </span>
          <span className="rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 font-display text-sm font-extrabold text-rose-200">
            18+
          </span>
        </div>
        <h2 id="fp-age-title" className="font-display text-xl font-extrabold text-white">
          {t("pub_age_title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/55">{t("pub_age_text")}</p>

        <div className="mt-7 grid gap-3">
          <button
            type="button"
            autoFocus
            onClick={confirmAge}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95"
          >
            <Check className="h-4 w-4" />
            {t("pub_age_yes")}
          </button>
          <a
            href="https://www.google.com"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white/70 transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {t("pub_age_no")}
          </a>
        </div>
        <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-white/35">
          <ShieldAlert className="h-3.5 w-3.5" />
          {t("pub_age_note")}
        </p>
      </div>
    </div>
  );
}
