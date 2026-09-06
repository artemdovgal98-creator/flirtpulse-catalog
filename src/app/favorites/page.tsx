"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { HeartCrack, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/components/FavoritesProvider";
import { api } from "@/lib/api";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import type { Offer } from "@/lib/catalog";

export default function FavoritesPage() {
  const { t } = useI18n();
  const { ids, ready } = useFavorites();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (ids.length === 0) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get<{ items: Offer[] }>(`/api/offers?ids=${ids.join(",")}&limit=100`)
      .then((res) => {
        if (res.ok && res.data) {
          // Keep the order in which offers were saved (most recent first).
          const byId = new Map(res.data.items.map((o) => [o._id, o]));
          setOffers(ids.map((id) => byId.get(id)).filter(Boolean) as Offer[]);
          console.log(`[favorites] rendering ${res.data.items.length} saved offers`);
        } else {
          console.error("[favorites] could not load saved offers:", res.error);
          setOffers([]);
        }
        setLoading(false);
      });
    // `ids` changes on every toggle, which is exactly when we want to refresh.
  }, [ids, ready]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          {t("fav_title")}
        </h1>
        <p className="mt-1 text-sm text-white/45">
          {ids.length} {t("fav_count")}
        </p>
      </header>

      {loading || !ready ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="fp-card fp-rise flex flex-col items-center gap-4 rounded-3xl px-6 py-20 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500/20 to-fuchsia-600/20">
            <HeartCrack className="h-7 w-7 text-rose-300/80" />
          </span>
          <h2 className="font-display text-lg font-bold text-white">{t("fav_empty")}</h2>
          <p className="max-w-sm text-sm text-white/45">{t("fav_empty_desc")}</p>
          <Link
            href="/catalog"
            className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_36px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95"
          >
            {t("fav_open_catalog")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, i) => (
            <OfferCard key={offer._id} offer={offer} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
