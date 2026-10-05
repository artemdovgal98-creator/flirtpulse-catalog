"use client";

/** "Recently viewed" rail — ids from this device, data from /api/offers?ids=. Hidden when empty. */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { getRecent } from "@/lib/recent";
import { offerImages, type Offer } from "@/lib/catalog";
import { useCategories } from "@/components/CategoriesProvider";

export function RecentStrip() {
  const { t, lang } = useI18n();
  const { label } = useCategories();
  const [items, setItems] = useState<Offer[]>([]);

  const load = useCallback(() => {
    const ids = getRecent();
    if (!ids.length) {
      setItems([]);
      return;
    }
    api
      .get<{ items: Offer[] }>(`/api/offers?ids=${ids.join(",")}&limit=${ids.length}&lang=${lang}`)
      .then((res) => {
        if (res.ok && res.data) {
          const byId = new Map(res.data.items.map((o) => [o._id, o]));
          setItems(ids.map((id) => byId.get(id)).filter(Boolean) as Offer[]);
          console.log(`[recent] ${res.data.items.length}/${ids.length} recently viewed still published`);
        } else {
          console.error("[recent] could not load recently viewed:", res.error);
        }
      });
  }, [lang]);

  useEffect(() => {
    load();
    window.addEventListener("fp-recent", load);
    return () => window.removeEventListener("fp-recent", load);
  }, [load]);

  if (!items.length) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-white">
        <History className="h-5 w-5 text-fuchsia-300" />
        {t("pub_recent_title")}
      </h2>
      <div className="fp-rail -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items.map((o, i) => {
          const cover = offerImages(o)[0];
          return (
            <Link
              key={o._id}
              href={`/offer/${o._id}`}
              className="fp-rise fp-card group relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl transition hover:-translate-y-1"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-24 overflow-hidden bg-gradient-to-br from-fuchsia-600/30 to-indigo-600/30">
                {cover && (
                  <img src={cover} alt={o.short_name || o.name} loading="lazy" className="h-full w-full object-cover opacity-70 transition group-hover:scale-110 group-hover:opacity-90" />
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[13px] font-bold text-white">{o.short_name || o.name}</p>
                <p className="truncate text-[11px] text-white/45">{(o.category ?? []).map((c) => label(c)).join(" · ")}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
