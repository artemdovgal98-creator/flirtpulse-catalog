"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ShieldCheck, Globe2, Zap, LayoutGrid } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { COLOR_SOFT } from "@/lib/catalog";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import { useCategories } from "@/components/CategoriesProvider";
import { AdSlot } from "@/components/ads/AdSlot";
import { QuizCta } from "@/components/engage/QuizCta";
import { ForYou } from "@/components/engage/ForYou";
import { RecentStrip } from "@/components/public/RecentStrip";
import { countCategoryView } from "@/lib/recent";
import { cn } from "@/lib/utils";

/** Insert the in-grid ad after this many category tiles. */
const AD_AFTER = 4;

interface PublicStats {
  services: number;
  geos: number;
  categories: number;
  languages: number;
  generatedAt: string;
}

const ZERO_STATS: PublicStats = {
  services: 0,
  geos: 0,
  categories: 0,
  languages: 0,
  generatedAt: "",
};

export default function HomePage() {
  const { t } = useI18n();
  const { categories, ready, label } = useCategories();
  // Counters start at zero and are replaced by the live numbers from the
  // database — nothing on this page is hard-coded any more.
  const [stats, setStats] = useState<PublicStats>(ZERO_STATS);

  const load = useCallback(async () => {
    const counters = await api.get<PublicStats>("/api/stats");

    if (counters.ok && counters.data) {
      setStats(counters.data);
      console.log("[home] live counters:", counters.data);
    } else {
      console.error("[home] could not load the counters:", counters.error);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-sync after the sandbox has been idle, so the tiles never show frozen data.
  useRefreshOnFocus(load);

  const tiles = [
    { value: stats.services, label: t("home_stat_offers"), Icon: Zap },
    { value: stats.geos, label: t("home_stat_geos"), Icon: Globe2 },
    { value: stats.categories, label: t("home_stat_models"), Icon: ShieldCheck },
    { value: stats.languages, label: t("home_stat_langs"), Icon: Sparkles },
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
            {tiles.map(({ value, label, Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Icon className="mb-2 h-4 w-4 text-fuchsia-300" />
                <p className="font-display text-2xl font-extrabold text-white">
                  {value.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories (managed in the admin, GEO-aware) */}
      <section className="mt-8" aria-labelledby="home-categories">
        <h2 id="home-categories" className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-white">
          <LayoutGrid className="h-5 w-5 text-fuchsia-300" />
          {t("filters_categories")}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {!ready
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="fp-card h-[104px] animate-pulse rounded-2xl" />
              ))
            : categories.map((c, i) => (
                <React.Fragment key={c.key}>
                  {i === AD_AFTER && (
                    <div className="col-span-full">
                      <AdSlot slot="home_between_categories" />
                    </div>
                  )}
                  <Link
                    href={`/catalog?category=${encodeURIComponent(c.key)}`}
                    onClick={() => countCategoryView(c.key)}
                    className={cn(
                      "fp-rise group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-4 transition hover:-translate-y-1 hover:border-white/25 sm:p-5",
                      COLOR_SOFT[c.color] ?? COLOR_SOFT.fuchsia
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="pointer-events-none absolute -right-3 -top-4 text-6xl opacity-20 transition duration-500 group-hover:rotate-12 group-hover:scale-110 group-hover:opacity-35">
                      {c.emoji}
                    </span>
                    <span className="relative block text-2xl leading-none">{c.emoji}</span>
                    <p className="relative mt-3 font-display text-[15px] font-bold leading-tight text-white sm:text-lg">
                      {label(c.key)}
                    </p>
                    <p className="relative mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/50 transition group-hover:text-white/80">
                      {t("home_cta")} <ArrowRight className="h-3 w-3" />
                    </p>
                  </Link>
                </React.Fragment>
              ))}
          {ready && categories.length > 0 && categories.length <= AD_AFTER && (
            <div className="col-span-full">
              <AdSlot slot="home_between_categories" />
            </div>
          )}
        </div>
      </section>

      <div className="mt-10 empty:hidden">
        <QuizCta />
      </div>

      <div className="mt-10 empty:hidden">
        <ForYou />
      </div>

      <RecentStrip />

      <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-[11px] leading-relaxed text-white/40">
        {t("prof_age_warning")}
      </p>
    </div>
  );
}
