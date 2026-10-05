"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Share2, Eye, Layers, ArrowRight, SearchX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import { QuizCta } from "@/components/engage/QuizCta";
import type { Offer } from "@/lib/catalog";

interface CollectionData {
  title: string;
  list: string;
  views: number;
  items: Offer[];
}

/** Public, read-only shared collection. */
export default function SharedCollectionPage() {
  const { t, lang } = useI18n();
  const params = useParams<{ token: string }>();
  const token = String(params?.token || "");
  const [data, setData] = useState<CollectionData | null>(null);
  const [notFound, setNotFound] = useState(false);
  // The view is counted once per page load (the language may switch right after mount).
  const counted = useRef(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const count = counted.current ? "0" : "1";
    counted.current = true;
    api.get<CollectionData>(`/api/collections/${encodeURIComponent(token)}?lang=${lang}&count=${count}`).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setData(res.data);
        console.log(`[collection] ${token}: ${res.data.items.length} showcases`);
      } else {
        console.error("[collection] not available:", res.error);
        setNotFound(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, lang]);

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-16 pt-10 sm:px-6">
        <div className="fp-card fp-rise flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-indigo-600/20">
            <SearchX className="h-7 w-7 text-fuchsia-300/80" />
          </span>
          <h1 className="font-display text-lg font-bold text-white">{t("col_not_found")}</h1>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
          >
            {t("col_open_catalog")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="fp-card fp-rise relative mb-6 overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl" />
        <p className="relative mb-2 inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-fuchsia-200 ring-1 ring-inset ring-fuchsia-400/30">
          <Share2 className="h-3 w-3" />
          {t("col_badge")}
        </p>
        <h1 className="relative font-display text-2xl font-extrabold text-white sm:text-3xl">
          {data ? data.title || t("col_default_title") : <span className="inline-block h-8 w-64 animate-pulse rounded-xl bg-white/10" />}
        </h1>
        {data && (
          <div className="relative mt-3 flex flex-wrap gap-3 text-xs font-semibold text-white/50">
            <span className="inline-flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" />{t("col_count", { n: data.items.length })}</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{t("col_views", { n: data.views })}</span>
          </div>
        )}
      </header>

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <OfferCardSkeleton key={i} />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="fp-card rounded-3xl px-6 py-14 text-center text-sm text-white/50">{t("col_empty")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((offer, i) => <OfferCard key={offer._id} offer={offer} index={i} />)}
        </div>
      )}

      <div className="mt-8">
        <QuizCta />
      </div>
    </div>
  );
}
