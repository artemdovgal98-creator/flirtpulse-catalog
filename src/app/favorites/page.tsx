"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartCrack, ArrowRight, Share2, Loader2, CheckCircle2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useFavorites, type FavoriteList } from "@/components/FavoritesProvider";
import { api } from "@/lib/api";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import type { Offer } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Tab = "all" | FavoriteList;

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all", label: "favl_all" },
  { key: "want_to_try", label: "favl_want" },
  { key: "tried", label: "favl_tried" },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("[favorites] clipboard failed:", err);
    return false;
  }
}

export default function FavoritesPage() {
  const { t, lang } = useI18n();
  const { ids, ready, listOf, setList } = useFavorites();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [sharing, setSharing] = useState(false);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (!ready) return;

    if (ids.length === 0) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get<{ items: Offer[] }>(`/api/offers?ids=${ids.join(",")}&limit=100&lang=${lang}`)
      .then((res) => {
        if (res.ok && res.data) {
          // Keep the order in which offers were saved.
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
  }, [idsKey, ready, lang]);

  const counts = useMemo(() => {
    const c = { all: offers.length, want_to_try: 0, tried: 0 };
    for (const o of offers) c[listOf(o._id)]++;
    return c;
  }, [offers, listOf]);

  const visible = tab === "all" ? offers : offers.filter((o) => listOf(o._id) === tab);

  async function share() {
    if (!visible.length || sharing) return;
    setSharing(true);
    const title = tab === "all" ? t("favl_share_title") : `${t("favl_share_title")} · ${t(tab === "tried" ? "favl_tried" : "favl_want")}`;
    const res = await api.post<{ token: string; path: string }>("/api/collections", {
      list: tab,
      title,
      offerIds: visible.map((o) => o._id),
    });
    setSharing(false);
    if (!res.ok || !res.data) {
      console.error("[favorites] could not create collection:", res.error);
      toast.error(t("eng_error"));
      return;
    }
    const url = `${window.location.origin}${res.data.path}`;
    console.log("[favorites] collection created:", url);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        console.error("[favorites] native share failed, copying instead:", err);
      }
    }
    if (await copyText(url)) toast.success(t("favl_share_ready"));
    else toast.message(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{t("fav_title")}</h1>
          <p className="mt-1 text-sm text-white/45">
            {ids.length} {t("fav_count")}
          </p>
        </div>
        {visible.length > 0 && !loading && (
          <button
            type="button"
            onClick={share}
            disabled={sharing}
            title={t("favl_share_desc")}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_36px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {sharing ? t("favl_sharing") : t("favl_share")}
          </button>
        )}
      </header>

      {ids.length > 0 && (
        <div className="fp-rail -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist">
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95",
                  active
                    ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"
                )}
              >
                {t(label)}
                <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-white/15" : "bg-white/5")}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
      )}

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
      ) : visible.length === 0 ? (
        <div className="fp-card rounded-3xl px-6 py-14 text-center text-sm text-white/45">{t("favl_empty_list")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((offer, i) => {
            const list = listOf(offer._id);
            const tried = list === "tried";
            return (
              <div key={offer._id} className="flex flex-col gap-2">
                <OfferCard offer={offer} index={i} />
                <button
                  type="button"
                  onClick={() => setList(offer._id, tried ? "want_to_try" : "tried")}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition active:scale-[0.98]",
                    tried
                      ? "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                  )}
                >
                  {tried ? <Bookmark className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {tried ? t("favl_move_want") : t("favl_move_tried")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
