"use client";

/**
 * Keeps the set of saved offers in sync.
 * - Signed-in users  → `favorite` table in Totalum (via /api/favorites)
 * - Guests           → localStorage, so the heart button always works
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";

const STORAGE_KEY = "flirtpulse_favorites";

interface FavoritesValue {
  ids: string[];
  ready: boolean;
  isSaved: (offerId: string) => boolean;
  toggle: (offerId: string) => Promise<void>;
  isGuest: boolean;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

function readLocal(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch (err) {
    console.error("[favorites] could not read local favorites:", err);
    return [];
  }
}

function writeLocal(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error("[favorites] could not persist local favorites:", err);
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const isGuest = !session?.user;

  useEffect(() => {
    if (isPending) return;

    let cancelled = false;

    async function load() {
      if (session?.user) {
        const res = await api.get<{ items: Array<{ offer?: { _id: string } | string }> }>("/api/favorites");
        if (cancelled) return;
        if (res.ok && res.data) {
          const remote = res.data.items
            .map((item) => (typeof item.offer === "string" ? item.offer : item.offer?._id))
            .filter(Boolean) as string[];
          console.log(`[favorites] loaded ${remote.length} saved offers from the database`);
          setIds(remote);
        } else {
          console.error("[favorites] could not load favorites:", res.error);
        }
      } else {
        const local = readLocal();
        console.log(`[favorites] guest mode — ${local.length} saved offers in localStorage`);
        setIds(local);
      }
      if (!cancelled) setReady(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session?.user, isPending]);

  const toggle = useCallback(
    async (offerId: string) => {
      const willSave = !ids.includes(offerId);
      const next = willSave ? [...ids, offerId] : ids.filter((id) => id !== offerId);
      setIds(next); // optimistic

      if (session?.user) {
        const res = await api.post<{ saved: boolean }>("/api/favorites", { offer_id: offerId });
        if (!res.ok) {
          console.error("[favorites] toggle failed, rolling back:", res.error);
          setIds(ids);
          return;
        }
        console.log(`[favorites] offer ${offerId} ${res.data?.saved ? "saved" : "removed"}`);
      } else {
        writeLocal(next);
        console.log(`[favorites] guest ${willSave ? "saved" : "removed"} offer ${offerId}`);
      }
    },
    [ids, session?.user]
  );

  const value = useMemo<FavoritesValue>(
    () => ({ ids, ready, isGuest, isSaved: (id: string) => ids.includes(id), toggle }),
    [ids, ready, isGuest, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
