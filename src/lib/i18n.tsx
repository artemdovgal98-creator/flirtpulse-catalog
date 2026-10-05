"use client";

/**
 * FlirtPulse AI — instant multi-language layer (12 locales, RTL aware).
 * Language is kept in localStorage and, for signed-in users, synced to the
 * `user_preference` table through /api/preferences.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RTL_LANGS as RTL, type Lang as LangCode } from "@/lib/languages";

// Single source of truth lives in `@/lib/languages` so server routes can read it too.
export { LANGUAGES, RTL_LANGS, LANGUAGE_COUNT } from "@/lib/languages";
export type { Lang } from "@/lib/languages";

import { DICTS, EN_DICT as en, type Dict } from "@/lib/i18n-dicts";
import { api } from "@/lib/api";

type Lang = LangCode;


const STORAGE_KEY = "flirtpulse_lang";
const REMOTE_CACHE_PREFIX = "flirtpulse_i18n_";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translates a key; `{name}` placeholders are replaced from `vars`. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nValue | null>(null);

function readRemoteCache(lang: string): Dict {
  try {
    const raw = window.localStorage.getItem(REMOTE_CACHE_PREFIX + lang);
    return raw ? (JSON.parse(raw) as Dict) : {};
  } catch {
    return {};
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ru");
  // Backend translations (stored per language in `ui_translation`) for keys the
  // static dictionary of that language does not cover yet.
  const [remote, setRemote] = useState<Dict>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && DICTS[stored]) {
        setLangState(stored);
        console.log("[i18n] restored language from storage:", stored);
      }
    } catch (err) {
      console.error("[i18n] could not read stored language:", err);
    }
  }, []);

  useEffect(() => {
    const dir = RTL.includes(lang) ? "rtl" : "ltr";
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
  }, [lang]);

  // Load the cached backend translations for the active language.
  useEffect(() => {
    let cancelled = false;
    setRemote(readRemoteCache(lang));
    if (lang === "en") return;
    const load = (attempt: number) => {
      api.get<{ strings: Dict; pending: number }>(`/api/i18n/${lang}`).then((res) => {
        if (cancelled) return;
        if (!res.ok || !res.data) {
          console.error("[i18n] backend translations unavailable:", res.error);
          return;
        }
        setRemote(res.data.strings || {});
        try {
          window.localStorage.setItem(REMOTE_CACHE_PREFIX + lang, JSON.stringify(res.data.strings || {}));
        } catch (err) {
          console.error("[i18n] could not cache backend strings:", err);
        }
        console.log(`[i18n] ${Object.keys(res.data.strings || {}).length} backend strings for ${lang}, pending=${res.data.pending}`);
        // The backend is still translating missing strings — poll a few times.
        if (res.data.pending > 0 && attempt < 6) setTimeout(() => load(attempt + 1), 8000);
      });
    };
    load(0);
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    console.log("[i18n] language switched to:", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (err) {
      console.error("[i18n] could not persist language:", err);
    }
    // Best-effort sync for signed-in users; never blocks the UI.
    api.put("/api/preferences", { language: next }).then((res) => {
      if (!res.ok) console.error("[i18n] preference sync failed:", res.error);
    });
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = DICTS[lang] ?? en;
    return {
      lang,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => {
        let text = dict[key] ?? remote[key] ?? en[key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
        return text;
      },
      dir: RTL.includes(lang) ? "rtl" : "ltr",
    };
  }, [lang, setLang, remote]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
