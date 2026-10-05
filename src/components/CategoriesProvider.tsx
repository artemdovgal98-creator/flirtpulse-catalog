"use client";

/**
 * Categories managed in the admin panel + the visitor's detected country.
 * Every screen reads categories from here instead of a hard-coded list, so a
 * category added in the admin shows up everywhere (home, catalog, filters).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CatalogCategory } from "@/lib/catalog";

interface CategoriesValue {
  categories: CatalogCategory[];
  geo: string;
  ready: boolean;
  /** Localised label: admin translation → built-in dictionary → original label. */
  label: (key: string) => string;
  get: (key: string) => CatalogCategory | undefined;
  reload: () => void;
}

const CategoriesContext = createContext<CategoriesValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { t, lang } = useI18n();
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [geo, setGeo] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    api.get<{ categories: CatalogCategory[]; geo: string }>("/api/categories").then((res) => {
      if (res.ok && res.data) {
        setCategories(res.data.categories);
        setGeo(res.data.geo || "");
        console.log(`[categories] ${res.data.categories.length} categories, geo=${res.data.geo || "-"}`);
      } else {
        console.error("[categories] could not load categories:", res.error);
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<CategoriesValue>(() => {
    const byKey = new Map(categories.map((c) => [c.key, c]));
    return {
      categories,
      geo,
      ready,
      get: (key) => byKey.get(key),
      label: (key) => {
        const c = byKey.get(key);
        if (c?.labels?.[lang]) return c.labels[lang];
        const builtIn = t(`cat_${key}`);
        if (builtIn !== `cat_${key}`) return builtIn;
        return c?.label || key;
      },
      reload: load,
    };
  }, [categories, geo, ready, lang, t, load]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used inside <CategoriesProvider>");
  return ctx;
}
