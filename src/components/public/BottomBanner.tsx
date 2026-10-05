"use client";

/** Dismissible ad strip pinned above the bottom navigation (hidden for the session once closed). */

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AdSlot } from "@/components/ads/AdSlot";
import { useAgeConfirmed } from "@/components/public/AgeGate";
import { useCompare } from "@/components/CompareProvider";

const KEY = "flirtpulse_bottom_banner_closed";

export function BottomBanner() {
  const { t } = useI18n();
  const confirmed = useAgeConfirmed();
  const { ids: compareIds } = useCompare();
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    try {
      setClosed(window.sessionStorage.getItem(KEY) === "yes");
    } catch {
      setClosed(false);
    }
  }, []);

  // The floating compare bar takes this spot while it is visible.
  if (closed || !confirmed || compareIds.length > 0) return null;

  const close = () => {
    setClosed(true);
    console.log("[bottom-banner] dismissed");
    try {
      window.sessionStorage.setItem(KEY, "yes");
    } catch (err) {
      console.error("[bottom-banner] could not persist dismissal:", err);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(66px+env(safe-area-inset-bottom))] z-30 px-3 pb-2">
      <div className="relative mx-auto max-w-md">
        <AdSlot slot="bottom_banner" />
        <button
          type="button"
          onClick={close}
          aria-label={t("pub_close")}
          className="absolute -right-1.5 -top-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#1a1030] text-white/70 shadow-lg transition hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
