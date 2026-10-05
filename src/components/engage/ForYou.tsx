"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Flame } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/components/FavoritesProvider";
import { api } from "@/lib/api";
import { getRecent, getViewedCategories } from "@/lib/recent";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import type { Offer } from "@/lib/catalog";

/** "For you" — horizontal rail of personal picks (falls back to what is popular). */
export function ForYou() {
  const { t, lang } = useI18n();
  const { ids: favoriteIds, ready } = useFavorites();
  const [items, setItems] = useState<Offer[] | null>(null);
  const [personal, setPersonal] = useState(false);
  const [tick, setTick] = useState(0);

  // Refresh when the visitor opens a showcase in another part of the app.
  useEffect(() => {
    const onRecent = () => setTick((n) => n + 1);
    window.addEventListener("fp-recent", onRecent);
    return () => window.removeEventListener("fp-recent", onRecent);
  }, []);

  const favKey = favoriteIds.join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    api
      .post<{ items: Offer[]; personal: boolean }>("/api/for-you", {
        favoriteIds,
        viewedCategories: getViewedCategories(),
        recentIds: getRecent(),
        lang,
      })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setItems(res.data.items);
          setPersonal(res.data.personal);
          console.log(`[for-you] ${res.data.items.length} picks (${res.data.personal ? "personal" : "popular"})`);
        } else {
          console.error("[for-you] could not load picks:", res.error);
          setItems([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, favKey, lang, tick]);

  if (items && items.length === 0) return null;

  return (
    <section className="fp-rise">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 ring-1 ring-inset ring-fuchsia-400/30">
            {personal ? <Sparkles className="h-4 w-4 text-fuchsia-200" /> : <Flame className="h-4 w-4 text-orange-300" />}
          </span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-white">{t("fy_title")}</h2>
            <p className="text-[11px] text-white/45">{personal ? t("fy_personal") : t("fy_popular")}</p>
          </div>
        </div>
      </div>
      <div className="fp-rail -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-[78%] shrink-0 snap-start sm:w-[300px]">
                <OfferCardSkeleton />
              </div>
            ))
          : items.map((offer, i) => (
              <div key={offer._id} className="w-[78%] shrink-0 snap-start sm:w-[300px]">
                <OfferCard offer={offer} index={i} />
              </div>
            ))}
      </div>
    </section>
  );
}
