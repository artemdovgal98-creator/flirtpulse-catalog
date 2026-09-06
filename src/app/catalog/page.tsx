"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ArrowUpDown, Loader2, SearchX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { OfferCard, OfferCardSkeleton } from "@/components/OfferCard";
import {
  CATEGORIES,
  GEO_CODES,
  GEO_FLAGS,
  GEO_NAMES,
  PAGE_SIZE,
  PAYOUT_MODELS,
  PAYOUT_MODEL_LABELS,
  SORT_OPTIONS,
  type Offer,
  type SortOption,
} from "@/lib/catalog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface OffersPayload {
  items: Offer[];
  total: number;
  offset: number;
  hasMore: boolean;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
        active
          ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white shadow-[0_0_18px_-8px_rgba(217,70,239,0.9)]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white/90"
      )}
    >
      {children}
    </button>
  );
}

function CatalogView() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [cats, setCats] = useState<string[]>(() =>
    (searchParams.get("category") || "").split(",").filter(Boolean)
  );
  const [geos, setGeos] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [geoSearch, setGeoSearch] = useState("");

  const [items, setItems] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const requestId = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(id);
  }, [query]);

  const queryString = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (cats.length) params.set("categories", cats.join(","));
      if (geos.length) params.set("geos", geos.join(","));
      if (models.length) params.set("models", models.join(","));
      params.set("sort", sort);
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));
      return params.toString();
    },
    [debouncedQuery, cats, geos, models, sort]
  );

  // Reload from the first page whenever a filter changes.
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");

    api.get<OffersPayload>(`/api/offers?${queryString(0)}`).then((res) => {
      if (id !== requestId.current) return;
      if (res.ok && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setHasMore(res.data.hasMore);
        console.log(`[catalog] loaded ${res.data.items.length}/${res.data.total} offers`);
      } else {
        console.error("[catalog] failed to load offers:", res.error);
        setError(typeof res.error === "string" ? res.error : "Could not load offers");
        setItems([]);
        setTotal(0);
        setHasMore(false);
      }
      setLoading(false);
    });
  }, [queryString]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    const id = requestId.current;

    api.get<OffersPayload>(`/api/offers?${queryString(items.length)}`).then((res) => {
      if (id !== requestId.current) return;
      if (res.ok && res.data) {
        setItems((prev) => [...prev, ...res.data!.items]);
        setHasMore(res.data.hasMore);
        console.log(`[catalog] loaded ${res.data.items.length} more offers`);
      } else {
        console.error("[catalog] failed to load more offers:", res.error);
      }
      setLoadingMore(false);
    });
  }, [hasMore, items.length, loading, loadingMore, queryString]);

  // Infinite scroll.
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const toggleIn = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const activeCount = cats.length + geos.length + models.length;

  const clearAll = () => {
    setCats([]);
    setGeos([]);
    setModels([]);
    setQuery("");
    setSort("relevance");
  };

  const visibleGeos = useMemo(() => {
    const needle = geoSearch.trim().toLowerCase();
    if (!needle) return GEO_CODES;
    return GEO_CODES.filter(
      (code) => code.includes(needle) || GEO_NAMES[code].toLowerCase().includes(needle)
    );
  }, [geoSearch]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
          {t("nav_catalog")}
        </h1>
        <p className="mt-1 text-sm text-white/45">{t("brand_tagline")}</p>
      </div>

      {/* Search + filter toolbar */}
      <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-white/5 bg-[#171029]/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search_placeholder")}
              aria-label={t("search_placeholder")}
              className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] pl-10 pr-9 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-500/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("filters_reset")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={t("filters_sort")}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-white/75 transition hover:border-white/25 hover:text-white"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t(`sort_${sort}`)}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="fp-glass w-48 border-white/10">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setSort(option)}
                  className={cn("cursor-pointer text-sm", sort === option && "text-fuchsia-300")}
                >
                  {t(`sort_${option}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label={t("filters")}
                className="relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-white/75 transition hover:border-fuchsia-400/40 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">{t("filters")}</span>
                {activeCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 px-1 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="fp-glass w-full overflow-y-auto border-white/10 sm:max-w-md"
            >
              <SheetHeader>
                <SheetTitle className="font-display text-lg text-white">{t("filters")}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 px-4 pb-10">
                <section>
                  <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
                    {t("filters_categories")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <Chip key={c} active={cats.includes(c)} onClick={() => toggleIn(cats, setCats, c)}>
                        {t(`cat_${c}`)}
                      </Chip>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
                    {t("filters_payout")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {PAYOUT_MODELS.map((m) => (
                      <Chip key={m} active={models.includes(m)} onClick={() => toggleIn(models, setModels, m)}>
                        {PAYOUT_MODEL_LABELS[m]}
                      </Chip>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
                    {t("filters_geo")}
                  </h3>
                  <input
                    value={geoSearch}
                    onChange={(e) => setGeoSearch(e.target.value)}
                    placeholder="United States, Hungary, Australia..."
                    aria-label={t("filters_geo")}
                    className="mb-3 h-10 w-full rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-fuchsia-400/50"
                  />
                  <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto pr-1">
                    {visibleGeos.map((code) => (
                      <Chip key={code} active={geos.includes(code)} onClick={() => toggleIn(geos, setGeos, code)}>
                        <span className="mr-1">{GEO_FLAGS[code]}</span>
                        {code === "worldwide" ? t("geo_worldwide") : GEO_NAMES[code]}
                      </Chip>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
                    {t("filters_sort")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <Chip key={option} active={sort === option} onClick={() => setSort(option)}>
                        {t(`sort_${option}`)}
                      </Chip>
                    ))}
                  </div>
                </section>

                <button
                  type="button"
                  onClick={clearAll}
                  className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  {t("filters_clear")}
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Quick category rail */}
        <div className="fp-rail mt-3 flex gap-2 overflow-x-auto">
          <Chip active={cats.length === 0} onClick={() => setCats([])}>
            {t("common_all")}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={cats.includes(c)} onClick={() => toggleIn(cats, setCats, c)}>
              {t(`cat_${c}`)}
            </Chip>
          ))}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 whitespace-nowrap rounded-full border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <X className="mr-1 inline h-3 w-3" />
              {t("filters_clear")}
            </button>
          )}
        </div>
      </div>

      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/35">
        {loading ? t("loading") : `${total} ${t("offers_found")}`}
      </p>

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="fp-card flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <SearchX className="h-10 w-10 text-white/25" />
          <h2 className="font-display text-lg font-bold text-white">{t("no_results")}</h2>
          <p className="max-w-sm text-sm text-white/45">{t("no_results_desc")}</p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            {t("filters_clear")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((offer, i) => (
              <OfferCard key={offer._id} offer={offer} index={i} />
            ))}
          </div>

          <div ref={sentinel} className="h-4" />

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? t("loading") : t("load_more")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <CatalogView />
    </Suspense>
  );
}
