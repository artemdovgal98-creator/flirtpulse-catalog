"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  Scale,
  Sparkles,
  Flame,
  TrendingUp,
  Languages,
  MapPin,
  KeyRound,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { getVisitorId } from "@/lib/visitor";
import { pushRecent } from "@/lib/recent";
import { useFavorites } from "@/components/FavoritesProvider";
import { useCompare } from "@/components/CompareProvider";
import { useCategories } from "@/components/CategoriesProvider";
import { AdSlot } from "@/components/ads/AdSlot";
import { Reviews } from "@/components/engage/Reviews";
import {
  CATEGORY_DOT,
  COLOR_DOT,
  COLOR_GRADIENT,
  CATEGORY_GRADIENT,
  GEO_FLAGS,
  GEO_NAMES,
  goPath,
  offerImages,
  type Offer,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

function Section({ icon: Icon, title, children }: { icon: typeof Tag; title: string; children: React.ReactNode }) {
  return (
    <div className="fp-card rounded-2xl p-4">
      <h2 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export function ShowcaseView({ initial }: { initial: Offer }) {
  const { t, lang } = useI18n();
  const { label, get: getCategory } = useCategories();
  const { isSaved, toggle } = useFavorites();
  const compare = useCompare();
  const [offer, setOffer] = useState<Offer>(initial);
  const [active, setActive] = useState(0);
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => {
    setVisitorId(getVisitorId());
    pushRecent(initial._id, initial.category ?? []);
    console.log(`[showcase] viewed ${initial._id}`);
  }, [initial._id, initial.category]);

  // Server HTML is in the source language; swap to the visitor's language.
  useEffect(() => {
    if (lang === "ru") {
      setOffer(initial);
      return;
    }
    api.get<{ offer: Offer }>(`/api/offers/${initial._id}?lang=${lang}`).then((res) => {
      if (res.ok && res.data) setOffer(res.data.offer);
      else console.error("[showcase] could not load localised showcase:", res.error);
    });
  }, [lang, initial]);

  const images = offerImages(offer).slice(0, 3);
  const cover = images[Math.min(active, Math.max(images.length - 1, 0))];
  const categories = offer.category ?? [];
  const primary = categories[0] ?? "";
  const gradient = CATEGORY_GRADIENT[primary] ?? COLOR_GRADIENT[getCategory(primary)?.color ?? ""] ?? "from-fuchsia-500 to-indigo-600";
  const badges = offer.badges ?? [];
  const tags = (offer.tags || "").split(",").map((s) => s.trim()).filter(Boolean);
  const saved = isSaved(offer._id);
  const compared = compare.has(offer._id);
  const title = offer.short_name || offer.name;
  const target = `${goPath(offer)}?v=${encodeURIComponent(visitorId || "anonymous")}&lang=${lang}`;
  const geo = offer.geo ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
      <Link href="/catalog" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/50 transition hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("nav_catalog")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Gallery */}
        <div className="fp-rise">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/10">
            {cover ? (
              <img src={cover} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", gradient)}>
                <span className="text-7xl drop-shadow-lg">{getCategory(primary)?.emoji ?? "✨"}</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171029]/80 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {offer.is_featured === "yes" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-black">
                  <Sparkles className="h-3 w-3" /> {t("featured")}
                </span>
              )}
              {badges.includes("new") && (
                <span className="rounded-full bg-cyan-400/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cyan-100 ring-1 ring-inset ring-cyan-300/30 backdrop-blur">
                  {t("pub_badge_new")}
                </span>
              )}
              {badges.includes("hit_week") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-100 ring-1 ring-inset ring-rose-300/35 backdrop-blur">
                  <Flame className="h-3 w-3" /> {t("pub_badge_hit")}
                </span>
              )}
              {badges.includes("trending") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-100 ring-1 ring-inset ring-violet-300/35 backdrop-blur">
                  <TrendingUp className="h-3 w-3" /> {t("pub_badge_trending")}
                </span>
              )}
            </div>
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`${title} — ${i + 1}`}
                  className={cn(
                    "aspect-[16/10] overflow-hidden rounded-xl border transition",
                    i === active ? "border-fuchsia-400/70 shadow-[0_0_18px_-6px_rgba(217,70,239,0.9)]" : "border-white/10 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="fp-rise flex flex-col gap-4" style={{ animationDelay: "80ms" }}>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Link
                key={c}
                href={`/catalog?category=${encodeURIComponent(c)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/10 transition hover:text-white"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT[c] ?? COLOR_DOT[getCategory(c)?.color ?? ""] ?? "bg-fuchsia-400")} />
                {label(c)}
              </Link>
            ))}
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            <span className="fp-sheen">{title}</span>
          </h1>
          {offer.short_name && offer.short_name !== offer.name && <p className="-mt-2 text-sm text-white/45">{offer.name}</p>}

          {offer.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-white/65">{offer.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={target}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              onClick={() => {
                console.log(`[showcase] CTA → ${goPath(offer)}`);
                pushRecent(offer._id, categories);
              }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95 sm:flex-none"
            >
              {t("pub_go_site")}
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => toggle(offer._id)}
              aria-pressed={saved}
              aria-label={saved ? t("saved") : t("save")}
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-full border transition active:scale-90",
                saved ? "border-rose-400/50 bg-rose-500/25 text-rose-300" : "border-white/15 bg-white/5 text-white/70 hover:text-rose-300"
              )}
            >
              <Heart className={cn("h-5 w-5", saved && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={() => compare.toggle(offer._id)}
              aria-pressed={compared}
              aria-label={t("pub_compare")}
              title={t("pub_compare")}
              className={cn(
                "inline-flex h-12 w-12 items-center justify-center rounded-full border transition active:scale-90",
                compared ? "border-indigo-300/60 bg-indigo-500/25 text-indigo-100" : "border-white/15 bg-white/5 text-white/70 hover:text-white"
              )}
            >
              <Scale className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {offer.access_model && (
              <Section icon={KeyRound} title={t("pub_access_title")}>
                <p className="text-sm font-bold text-white">{t(`pub_access_${offer.access_model}`)}</p>
              </Section>
            )}
            {(offer.languages ?? []).length > 0 && (
              <Section icon={Languages} title={t("pub_languages")}>
                <div className="flex flex-wrap gap-1.5">
                  {(offer.languages ?? []).map((code) => {
                    const l = LANGUAGES.find((x) => x.code === code);
                    return (
                      <span key={code} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/10">
                        {l?.flag} {l?.label ?? code.toUpperCase()}
                      </span>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>

          {geo.length > 0 && (
            <Section icon={MapPin} title={t("filters_geo")}>
              <div className="flex flex-wrap gap-1.5">
                {geo.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/10">
                    {GEO_FLAGS[g] ?? "🏳️"} {g === "worldwide" ? t("geo_worldwide") : GEO_NAMES[g] || g.toUpperCase()}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {tags.length > 0 && (
            <Section icon={Tag} title={t("pub_tags")}>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/catalog?q=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-inset ring-fuchsia-400/20 transition hover:bg-fuchsia-500/20"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>

      <div className="mt-8">
        <AdSlot slot="showcase_page" />
      </div>

      <div className="mt-8">
        <Reviews offerId={offer._id} />
      </div>

      <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-[11px] leading-relaxed text-white/40">
        {t("prof_age_warning")}
      </p>
    </div>
  );
}
