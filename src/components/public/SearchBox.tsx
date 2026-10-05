"use client";

/** Header search with live suggestions. Enter → /catalog?q=…, suggestion → /offer/[id]. */

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/components/CategoriesProvider";
import { cn } from "@/lib/utils";

interface Suggestion {
  _id: string;
  name: string;
  short_name: string;
  category: string[];
  image: string;
  go_path: string;
}

export function SearchBox() {
  const { t, lang } = useI18n();
  const { label } = useCategories();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const timer = setTimeout(() => {
      api
        .get<{ items: Suggestion[] }>(`/api/offers/suggest?q=${encodeURIComponent(term)}&lang=${lang}`)
        .then((res) => {
          if (id !== reqId.current) return;
          if (res.ok && res.data) {
            setItems(res.data.items);
            setActive(-1);
          } else {
            console.error("[search] suggestions failed:", res.error);
            setItems([]);
          }
          setLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [q, lang]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const goCatalog = () => {
    const term = q.trim();
    console.log(`[search] submit "${term}"`);
    setOpen(false);
    router.push(term ? `/catalog?q=${encodeURIComponent(term)}` : "/catalog");
  };

  const goOffer = (s: Suggestion) => {
    console.log(`[search] open suggestion ${s._id}`);
    setOpen(false);
    setQ("");
    router.push(`/offer/${s._id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) goOffer(items[active]);
      else goCatalog();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={wrap} className="relative min-w-0 flex-1 sm:max-w-sm">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goCatalog();
        }}
        className="group flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 transition focus-within:border-fuchsia-400/50 focus-within:bg-white/[0.07] hover:border-white/20"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-white/45" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("search_placeholder")}
          aria-label={t("search_placeholder")}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
        />
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/40" />
        ) : (
          q && (
            <button type="button" aria-label={t("filters_reset")} onClick={() => setQ("")} className="text-white/40 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </form>

      {showPanel && (
        <div className="fp-glass fp-rise absolute left-0 right-0 top-11 z-50 min-w-[260px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          {items.length === 0 && !loading ? (
            <p className="px-4 py-4 text-xs text-white/45">{t("pub_search_none")}</p>
          ) : (
            <ul role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
              {items.map((s, i) => (
                <li key={s._id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => goOffer(s)}
                    className={cn("flex w-full items-center gap-3 px-3 py-2 text-left transition", i === active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]")}
                  >
                    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30">
                      {s.image && <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-white">{s.short_name || s.name}</span>
                      <span className="block truncate text-[11px] text-white/45">{s.category.map((c) => label(c)).join(" · ")}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={goCatalog}
            className="flex w-full items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs font-bold text-fuchsia-300 hover:bg-white/[0.04] hover:text-fuchsia-200"
          >
            {t("pub_search_all", { q: q.trim() })}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
