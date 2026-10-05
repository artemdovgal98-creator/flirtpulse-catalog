"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, X, ExternalLink, ThumbsUp, ThumbsDown, ArrowRight, Loader2, Sparkles, Flame, Trophy, Star } from "lucide-react";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useCompare } from "@/components/CompareProvider";
import { useCategories } from "@/components/CategoriesProvider";
import { api } from "@/lib/api";
import { getVisitorId } from "@/lib/visitor";
import { GEO_FLAGS, GEO_NAMES, CATEGORY_GRADIENT, offerImages, goPath, type Offer } from "@/lib/catalog";
import { QuizCta } from "@/components/engage/QuizCta";
import { cn } from "@/lib/utils";

type CompareOffer = Offer & { rating: { up: number; down: number; percent: number | null } };

const LANG_BY_CODE = new Map<string, { label: string; flag: string }>(LANGUAGES.map((l) => [l.code, l]));

const BADGE_STYLE: Record<string, { cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  hit_week: { cls: "bg-amber-400/15 text-amber-200 ring-amber-300/30", Icon: Trophy },
  trending: { cls: "bg-orange-500/15 text-orange-200 ring-orange-400/30", Icon: Flame },
  new: { cls: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/30", Icon: Sparkles },
  featured: { cls: "bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/30", Icon: Star },
};

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/75 ring-1 ring-inset ring-white/10", className)}>
      {children}
    </span>
  );
}

export default function ComparePage() {
  const { t, lang } = useI18n();
  const { ids, toggle, clear } = useCompare();
  const { label } = useCategories();
  const [items, setItems] = useState<CompareOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitorId, setVisitorId] = useState("");

  useEffect(() => setVisitorId(getVisitorId()), []);

  const key = ids.join(",");
  useEffect(() => {
    if (!ids.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.post<{ items: CompareOffer[] }>("/api/compare", { ids, lang }).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setItems(res.data.items);
        console.log(`[compare] loaded ${res.data.items.length} showcases`);
      } else {
        console.error("[compare] could not load:", res.error);
        setItems([]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [key, lang]);

  const unknown = <span className="text-white/30">{t("eng_unknown")}</span>;

  const rows: Array<{ key: string; title: string; render: (o: CompareOffer) => React.ReactNode }> = [
    {
      key: "category",
      title: t("cmp_row_category"),
      render: (o) =>
        o.category?.length ? (
          <div className="flex flex-wrap gap-1">{o.category.map((c) => <Chip key={c}>{label(c)}</Chip>)}</div>
        ) : unknown,
    },
    {
      key: "model",
      title: t("cmp_row_model"),
      render: (o) =>
        o.access_model ? (
          <Chip className="bg-emerald-400/10 text-emerald-200 ring-emerald-400/25">{t(`eng_acc_${o.access_model}`)}</Chip>
        ) : unknown,
    },
    {
      key: "geo",
      title: t("cmp_row_geo"),
      render: (o) => {
        const geo = o.geo ?? [];
        if (!geo.length || geo.includes("worldwide")) return <Chip className="bg-emerald-400/10 text-emerald-200 ring-emerald-400/25">🌍 {t("geo_worldwide")}</Chip>;
        return (
          <div className="flex flex-wrap gap-1">
            {geo.slice(0, 8).map((g) => (
              <Chip key={g}>
                <span title={GEO_NAMES[g] || g}>{GEO_FLAGS[g] ?? "🏳️"}</span>
                <span className="uppercase">{g}</span>
              </Chip>
            ))}
            {geo.length > 8 && <span className="text-[11px] text-white/40">+{geo.length - 8}</span>}
          </div>
        );
      },
    },
    {
      key: "languages",
      title: t("cmp_row_languages"),
      render: (o) =>
        o.languages?.length ? (
          <div className="flex flex-wrap gap-1">
            {o.languages.map((l) => (
              <Chip key={l}>
                {LANG_BY_CODE.get(l)?.flag ?? "🏳️"} <span className="uppercase">{l}</span>
              </Chip>
            ))}
          </div>
        ) : unknown,
    },
    {
      key: "features",
      title: t("cmp_row_features"),
      render: (o) => {
        const subs = o.subfilters ?? [];
        const tags = String(o.tags || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);
        if (!subs.length && !tags.length) return unknown;
        return (
          <div className="flex flex-wrap gap-1">
            {subs.map((s) => (
              <Chip key={s} className="bg-fuchsia-500/10 text-fuchsia-200 ring-fuchsia-400/25">{t(`eng_sub_${s}`)}</Chip>
            ))}
            {tags.map((tag) => <Chip key={tag}>#{tag}</Chip>)}
          </div>
        );
      },
    },
    {
      key: "badges",
      title: t("cmp_row_badges"),
      render: (o) => {
        const list = [...(o.is_featured === "yes" ? ["featured"] : []), ...(o.badges ?? [])];
        if (!list.length) return unknown;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((b) => {
              const s = BADGE_STYLE[b] ?? BADGE_STYLE.new;
              return (
                <Chip key={b} className={s.cls}>
                  <s.Icon className="h-3 w-3" />
                  {t(`eng_badge_${b}`)}
                </Chip>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "rating",
      title: t("cmp_row_rating"),
      render: (o) => {
        const total = o.rating.up + o.rating.down;
        if (!total) return <span className="text-xs text-white/35">{t("cmp_no_reviews")}</span>;
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-1 text-emerald-300"><ThumbsUp className="h-3.5 w-3.5" />{o.rating.up}</span>
              <span className="inline-flex items-center gap-1 text-rose-300"><ThumbsDown className="h-3.5 w-3.5" />{o.rating.down}</span>
            </div>
            <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-rose-500/30">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${o.rating.percent ?? 0}%` }} />
            </div>
            <p className="text-[11px] text-white/40">{t("cmp_votes", { n: total })}</p>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_26px_-6px_rgba(217,70,239,0.95)]">
            <Scale className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{t("cmp_title")}</h1>
            <p className="text-sm text-white/45">{t("cmp_subtitle")}</p>
          </div>
        </div>
        {ids.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/60 transition hover:border-rose-400/40 hover:text-rose-300"
          >
            <X className="h-3.5 w-3.5" />
            {t("cmp_clear")}
          </button>
        )}
      </header>

      {loading ? (
        <div className="fp-card flex items-center justify-center rounded-3xl py-20">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="space-y-4">
          <div className="fp-card fp-rise flex flex-col items-center gap-4 rounded-3xl px-6 py-16 text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500/20 to-indigo-600/20">
              <Scale className="h-7 w-7 text-fuchsia-300/80" />
            </span>
            <h2 className="font-display text-lg font-bold text-white">{t("cmp_empty")}</h2>
            <p className="max-w-sm text-sm text-white/45">{t("cmp_empty_desc")}</p>
            <Link
              href="/catalog"
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
            >
              {t("cmp_open_catalog")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <QuizCta />
        </div>
      ) : (
        <div className="fp-card fp-rise overflow-hidden rounded-3xl">
          <div className="fp-rail overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-28 bg-[#170f28]/95 p-3 backdrop-blur sm:w-36" />
                  {items.map((o) => {
                    const cover = offerImages(o)[0];
                    const primary = o.category?.[0] ?? "dating";
                    return (
                      <th key={o._id} className="min-w-[200px] border-l border-white/5 p-3 align-top font-normal">
                        <div className="relative overflow-hidden rounded-2xl">
                          {cover ? (
                            <img src={cover} alt={o.name} loading="lazy" className="h-24 w-full object-cover opacity-70" />
                          ) : (
                            <div className={cn("h-24 w-full bg-gradient-to-br", CATEGORY_GRADIENT[primary] ?? "from-fuchsia-500 to-indigo-600")} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#171029] via-[#171029]/40 to-transparent" />
                          <button
                            type="button"
                            onClick={() => toggle(o._id)}
                            aria-label={t("cmp_remove")}
                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white/70 backdrop-blur transition hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <Link href={`/offer/${o._id}`} className="absolute inset-x-3 bottom-2 line-clamp-2 font-display text-sm font-extrabold text-white hover:underline">
                            {o.short_name || o.name}
                          </Link>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-white/5">
                    <th scope="row" className="sticky left-0 z-10 bg-[#170f28]/95 p-3 align-top text-[11px] font-extrabold uppercase tracking-wider text-white/45 backdrop-blur">
                      {row.title}
                    </th>
                    {items.map((o) => (
                      <td key={o._id} className="border-l border-white/5 p-3 align-top text-sm text-white/80">
                        {row.render(o)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-white/5">
                  <th className="sticky left-0 z-10 bg-[#170f28]/95 p-3 backdrop-blur" />
                  {items.map((o) => (
                    <td key={o._id} className="border-l border-white/5 p-3">
                      <a
                        href={`${goPath(o)}?v=${encodeURIComponent(visitorId || "anonymous")}&lang=${lang}`}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
                      >
                        {t("cmp_open")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
