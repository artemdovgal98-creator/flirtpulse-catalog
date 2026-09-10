"use client";

import React, { useEffect, useState } from "react";
import { Heart, ExternalLink, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFavorites } from "@/components/FavoritesProvider";
import { getVisitorId } from "@/lib/visitor";
import {
  CATEGORY_GRADIENT,
  CATEGORY_DOT,
  GEO_FLAGS,
  GEO_NAMES,
  offerImages,
  type Offer,
} from "@/lib/catalog";
import { COMPANY_BY_NAME } from "@/data/companies";
import { cn } from "@/lib/utils";

function GeoStrip({ geo }: { geo: string[] }) {
  const { t } = useI18n();
  if (geo.includes("worldwide")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
        🌍 {t("geo_worldwide")}
      </span>
    );
  }
  const shown = geo.slice(0, 5);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((g) => (
        <span
          key={g}
          title={GEO_NAMES[g] || g}
          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase text-white/70 ring-1 ring-inset ring-white/10"
        >
          <span className="text-[12px] leading-none">{GEO_FLAGS[g] ?? "🏳️"}</span>
          {g}
        </span>
      ))}
      {geo.length > shown.length && (
        <span className="text-[11px] font-semibold text-white/40">+{geo.length - shown.length}</span>
      )}
    </span>
  );
}

export function OfferCard({ offer, index = 0 }: { offer: Offer; index?: number }) {
  const { t, lang } = useI18n();
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(offer._id);
  const [slide, setSlide] = useState(0);
  const [visitorId, setVisitorId] = useState("");

  // Read on mount only — localStorage is unavailable during SSR.
  useEffect(() => setVisitorId(getVisitorId()), []);

  const categories = offer.category ?? [];
  const primary = categories[0] ?? "dating";
  const images = offerImages(offer);
  const cover = images[Math.min(slide, Math.max(images.length - 1, 0))];
  // Company cards carry a square logo, not a photo: it must be shown whole and
  // at full brightness instead of being cropped and dimmed like a cover image.
  const company = COMPANY_BY_NAME[offer.name?.toLowerCase() ?? ""];
  const isNew =
    offer.launch_date != null &&
    Date.now() - new Date(offer.launch_date).getTime() < 1000 * 60 * 60 * 24 * 90;

  // The real destination stays on the server — visitors always go through /go/{id}.
  const target = `/go/${offer._id}?v=${encodeURIComponent(visitorId || "anonymous")}&lang=${lang}`;

  return (
    <article
      className="fp-rise fp-card group relative flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(168,85,247,0.65)]"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="relative h-32 overflow-hidden">
        {company ? (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br p-5",
              company.accent
            )}
          >
            <img
              src={company.logo}
              alt={company.name}
              loading="lazy"
              className="h-16 w-16 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] transition duration-500 group-hover:scale-110"
            />
          </div>
        ) : cover ? (
          <img
            src={cover}
            alt={offer.name}
            loading="lazy"
            className="h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-110 group-hover:opacity-75"
          />
        ) : (
          <div className={cn("h-full w-full bg-gradient-to-br", CATEGORY_GRADIENT[primary])} />
        )}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-[#171029] to-transparent",
            company ? "via-[#171029]/10" : "via-[#171029]/60"
          )}
        />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {offer.is_featured === "yes" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
              <Sparkles className="h-3 w-3" /> {t("featured")}
            </span>
          )}
          {isNew && (
            <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-200 ring-1 ring-inset ring-cyan-300/30">
              {t("new_badge")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(offer._id)}
          aria-label={saved ? t("saved") : t("save")}
          aria-pressed={saved}
          className={cn(
            "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all active:scale-90",
            saved
              ? "border-rose-400/50 bg-rose-500/25 text-rose-300 shadow-[0_0_18px_-4px_rgba(244,63,94,0.9)]"
              : "border-white/15 bg-black/35 text-white/70 hover:border-rose-400/50 hover:text-rose-300"
          )}
        >
          <Heart className={cn("h-4 w-4 transition", saved && "fill-current scale-110")} />
        </button>

        {images.length > 1 && (
          <div className="absolute bottom-2 right-3 flex items-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${offer.name} — ${i + 1}`}
                onClick={() => setSlide(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === slide ? "w-4 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="font-display text-[15px] font-bold leading-tight text-white drop-shadow-lg">
            {offer.name}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/10"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT[c])} />
              {t(`cat_${c}`)}
            </span>
          ))}
        </div>

        {offer.description && (
          <p className="line-clamp-3 text-[12.5px] leading-relaxed text-white/55">
            {offer.description}
          </p>
        )}

        <GeoStrip geo={offer.geo ?? []} />

        <div className="mt-auto flex items-center justify-end gap-3 border-t border-white/5 pt-3">
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-[0_10px_28px_-12px_rgba(217,70,239,0.95)] transition hover:brightness-110 active:scale-95"
          >
            {t("open_offer")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="fp-card h-[340px] animate-pulse rounded-3xl">
      <div className="h-32 rounded-t-3xl bg-white/5" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded bg-white/5" />
        <div className="h-3 w-full rounded bg-white/5" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="h-8 w-full rounded bg-white/5" />
      </div>
    </div>
  );
}
