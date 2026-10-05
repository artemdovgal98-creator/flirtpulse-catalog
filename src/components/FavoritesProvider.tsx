"use client";

/**
 * Keeps the set of saved offers (and their collection list) in sync.
 * - Signed-in users  → `favorite` table in Totalum (via /api/favorites)
 * - Guests           → localStorage, so the heart button always works
 * Lists: "want_to_try" (default) | "tried".
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";

const STORAGE_KEY = "flirtpulse_favorites";
const LISTS_KEY = "flirtpulse_favorite_lists";

export type FavoriteList = "want_to_try" | "tried";

interface FavoritesValue {
  ids: string[];
  ready: boolean;
  isSaved: (offerId: string) => boolean;
  toggle: (offerId: string) => Promise<void>;
  isGuest: boolean;
  /** id → list ("want_to_try" when not set). */
  lists: Record<string, FavoriteList>;
  listOf: (offerId: string) => FavoriteList;
  setList: (offerId: string, list: FavoriteList) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.error(`[favorites] could not read ${key}:`, err);
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[favorites] could not persist ${key}:`, err);
  }
}

function normaliseList(v: unknown): FavoriteList {
  return v === "tried" ? "tried" : "want_to_try";
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [ids, setIds] = useState<string[]>([]);
  const [lists, setLists] = useState<Record<string, FavoriteList>>({});
  const [ready, setReady] = useState(false);

  const isGuest = !session?.user;

  useEffect(() => {
    if (isPending) return;

    let cancelled = false;

    async function load() {
      if (session?.user) {
        const res = await api.get<{ items: Array<{ offer?: { _id: string } | string; list?: string }> }>("/api/favorites");
        if (cancelled) return;
        if (res.ok && res.data) {
          const nextIds: string[] = [];
          const nextLists: Record<string, FavoriteList> = {};
          for (const item of res.data.items) {
            const id = typeof item.offer === "string" ? item.offer : item.offer?._id;
            if (!id) continue;
            nextIds.push(id);
            nextLists[id] = normaliseList(item.list);
          }
          console.log(`[favorites] loaded ${nextIds.length} saved offers from the database`);
          setIds(nextIds);
          setLists(nextLists);
        } else {
          console.error("[favorites] could not load favorites:", res.error);
        }
      } else {
        const local = readJson<string[]>(STORAGE_KEY, []);
        const localLists = readJson<Record<string, string>>(LISTS_KEY, {});
        const nextLists: Record<string, FavoriteList> = {};
        for (const id of local) nextLists[id] = normaliseList(localLists[id]);
        console.log(`[favorites] guest mode — ${local.length} saved offers in localStorage`);
        setIds(local);
        setLists(nextLists);
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
      const nextLists = { ...lists };
      if (willSave) nextLists[offerId] = "want_to_try";
      else delete nextLists[offerId];
      setIds(next); // optimistic
      setLists(nextLists);

      if (session?.user) {
        const res = await api.post<{ saved: boolean }>("/api/favorites", { offer_id: offerId });
        if (!res.ok) {
          console.error("[favorites] toggle failed, rolling back:", res.error);
          setIds(ids);
          setLists(lists);
          return;
        }
        console.log(`[favorites] offer ${offerId} ${res.data?.saved ? "saved" : "removed"}`);
      } else {
        writeJson(STORAGE_KEY, next);
        writeJson(LISTS_KEY, nextLists);
        console.log(`[favorites] guest ${willSave ? "saved" : "removed"} offer ${offerId}`);
      }
    },
    [ids, lists, session?.user]
  );

  const setList = useCallback(
    async (offerId: string, list: FavoriteList) => {
      const prevIds = ids;
      const prevLists = lists;
      const nextIds = ids.includes(offerId) ? ids : [...ids, offerId];
      const nextLists = { ...lists, [offerId]: list };
      setIds(nextIds);
      setLists(nextLists);

      if (session?.user) {
        const res = await api.put<{ list: string }>("/api/favorites", { offerId, list });
        if (!res.ok) {
          console.error("[favorites] moving to list failed, rolling back:", res.error);
          setIds(prevIds);
          setLists(prevLists);
          return;
        }
      } else {
        writeJson(STORAGE_KEY, nextIds);
        writeJson(LISTS_KEY, nextLists);
      }
      console.log(`[favorites] offer ${offerId} moved to ${list}`);
    },
    [ids, lists, session?.user]
  );

  const value = useMemo<FavoritesValue>(
    () => ({
      ids,
      ready,
      isGuest,
      isSaved: (id: string) => ids.includes(id),
      toggle,
      lists,
      listOf: (id: string) => lists[id] ?? "want_to_try",
      setList,
    }),
    [ids, ready, isGuest, toggle, lists, setList]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
