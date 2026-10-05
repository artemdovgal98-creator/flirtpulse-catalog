"use client";

/** Up to 3 showcases picked for side-by-side comparison (kept in localStorage). */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const KEY = "flirtpulse_compare";
export const COMPARE_MAX = 3;

interface CompareValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setIds(JSON.parse(window.localStorage.getItem(KEY) || "[]") as string[]);
    } catch {
      setIds([]);
    }
  }, []);

  const persist = (next: string[]) => {
    setIds(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch (err) {
      console.error("[compare] could not persist:", err);
    }
  };

  const toggle = useCallback(
    (id: string) => {
      if (ids.includes(id)) return persist(ids.filter((x) => x !== id));
      if (ids.length >= COMPARE_MAX) {
        toast.error(t("compare_max", { n: COMPARE_MAX }));
        return;
      }
      persist([...ids, id]);
      console.log(`[compare] added ${id} (${ids.length + 1}/${COMPARE_MAX})`);
    },
    [ids, t]
  );

  const value = useMemo<CompareValue>(
    () => ({ ids, has: (id) => ids.includes(id), toggle, clear: () => persist([]) }),
    [ids, toggle]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside <CompareProvider>");
  return ctx;
}
