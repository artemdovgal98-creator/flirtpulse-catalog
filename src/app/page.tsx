"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Globe2, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import { CATEGORIES, GEO_CODES, type Offer } from "@/lib/catalog";
import { LANGUAGES } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { t } = useI18n();
  const [featured, setFeatured] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ items: Offer[]; total: number }>("/api/offers?sort=relevance&limit=6")
      .then((res) => {
        if (res.ok && res.data) {
          setFeatured(res.data.items);
          setTotal(res.data.total);
          console.log(`[home] loaded ${res.data.items.length} featured offers of ${res.data.total}`);
        } else {
          console.error("[home] could not load featured offers:", res.error);
        }
        setLoading(false);
      });
  }, []);

  const stats = [
    { value: total ? `${total}+` : "260+", label: t("home_stat_offers"), Icon: Zap },
    { value: `${GEO_CODES.length}`, label: t("home_stat_geos"), Icon: Globe2 },
    { value: `${CATEGORIES.length}`, label: t("home_stat_models"), Icon: ShieldCheck },
    { value: `${LANGUAGES.length}`, label: t("home_stat_langs"), Icon: Sparkles },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      {/* Hero */}
      <section className="fp-rise relative overflow-hidden rounded-[2rem] border border-white/10 p-7 sm:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-indigo-600/25 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70">
            {t("home_badge")}
          </span>

          <h1 className="mt-5 max-w-3xl font-display text-3xl font-extrabold leading-[1.1] text-white sm:text-5xl">
            <span className="fp-sheen">{t("home_title")}</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
            {t("home_sub")}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95"
            >
              {t("home_cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ai-chat"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white/85 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              {t("home_cta2")}
            </Link>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ value, label, Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Icon className="mb-2 h-4 w-4 text-fuchsia-300" />
                <p className="font-display text-2xl font-extrabold text-white">{value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category shortcuts */}
      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c, i) => (
          <Link
            key={c}
            href={`/catalog?category=${c}`}
            className={cn(
              "fp-rise group relative overflow-hidden rounded-2xl border border-white/10 p-5 transition hover:-translate-y-1",
              "bg-gradient-to-br",
              c === "dating" && "from-rose-500/20 to-fuchsia-600/10",
              c === "webcam" && "from-violet-500/20 to-indigo-600/10",
              c === "live_cams" && "from-cyan-500/20 to-blue-600/10"
            )}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <p className="font-display text-lg font-bold text-white">{t(`cat_${c}`)}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/50 transition group-hover:text-white/80">
              {t("home_cta")} <ArrowRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </section>

      {/* Top offers */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-extrabold text-white">
            {t("featured")} · {t("nav_catalog")}
          </h2>
          <Link href="/catalog" className="text-xs font-bold text-fuchsia-300 hover:text-fuchsia-200">
            {t("home_cta")} →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <OfferCardSkeleton key={i} />)
            : featured.map((offer, i) => <OfferCard key={offer._id} offer={offer} index={i} />)}
        </div>
      </section>

      <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-[11px] leading-relaxed text-white/40">
        {t("prof_age_warning")}
      </p>
    </div>
  );
}
