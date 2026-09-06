"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LogOut, LogIn, UserPlus, Heart, Check, Shield, FileText, Info, Cookie, Mail, ChevronRight, Loader2, ShieldCheck,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useFavorites } from "@/components/FavoritesProvider";
import { api } from "@/lib/api";
import { CATEGORIES } from "@/lib/catalog";
import { AdminStats } from "@/components/admin/AdminStats";
import { ShowcaseManager } from "@/components/admin/ShowcaseManager";
import { cn } from "@/lib/utils";

const LEGAL_LINKS = [
  { href: "/privacy-policy", key: "prof_privacy", Icon: Shield },
  { href: "/terms-of-service", key: "prof_terms", Icon: FileText },
  { href: "/about", key: "prof_about", Icon: Info },
  { href: "/cookie-policy", key: "prof_cookies", Icon: Cookie },
  { href: "/contacts", key: "prof_contacts", Icon: Mail },
];

const PREFS_KEY = "flirtpulse_categories";

export default function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { data: session, isPending } = useSession();
  const { ids, isGuest } = useFavorites();

  const [prefCats, setPrefCats] = useState<string[]>(["dating", "webcam", "live_cams"]);
  const [signingOut, setSigningOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Local value first so the UI never flashes empty, then the stored preference.
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefCats(JSON.parse(raw) as string[]);
    } catch (err) {
      console.error("[profile] could not read local categories:", err);
    }

    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    // The server decides — this only controls whether the panel is rendered.
    api.get<{ isAdmin: boolean }>("/api/admin/me").then((res) => {
      const admin = Boolean(res.ok && res.data?.isAdmin);
      setIsAdmin(admin);
      console.log("[profile] admin access:", admin);
    });

    api.get<{ preferred_categories?: string[] } | null>("/api/preferences").then((res) => {
      if (res.ok && res.data?.preferred_categories?.length) {
        setPrefCats(res.data.preferred_categories);
        console.log("[profile] loaded stored preferences:", res.data.preferred_categories);
      }
    });
  }, [session?.user]);

  function toggleCategory(category: string) {
    const next = prefCats.includes(category)
      ? prefCats.filter((c) => c !== category)
      : [...prefCats, category];
    setPrefCats(next);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("[profile] could not persist local categories:", err);
    }
    api
      .put("/api/preferences", { preferred_categories: next })
      .then((res) => {
        if (!res.ok) console.error("[profile] could not save preferences:", res.error);
      });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      console.log("[profile] user signed out");
      window.location.href = "/";
    } catch (err) {
      console.error("[profile] sign out failed:", err);
      setSigningOut(false);
    }
  }

  const user = session?.user;
  const initials = (user?.name || user?.email || "FP")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="mb-5 font-display text-2xl font-extrabold text-white sm:text-3xl">
        {t("prof_title")}
      </h1>

      {/* Account card */}
      <section className="fp-card fp-rise relative overflow-hidden rounded-3xl p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 font-display text-lg font-extrabold text-white shadow-[0_0_28px_-8px_rgba(217,70,239,0.95)]">
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-lg font-bold text-white">
              {user?.name || t("prof_guest")}
            </p>
            <p className="truncate text-sm text-white/45">{user?.email || t("prof_guest_desc")}</p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2">
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-2.5 text-sm font-bold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {t("prof_logout")}
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
              >
                <LogIn className="h-4 w-4" />
                {t("prof_login")}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95"
              >
                <UserPlus className="h-4 w-4" />
                {t("prof_register")}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Admin dashboard — only rendered for administrators. Every underlying
          API route re-checks the role server-side, so hiding the UI is not the
          security boundary, it is just the presentation. */}
      {isAdmin && (
        <div className="mt-5">
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-xs font-bold text-emerald-200">{t("admin_open_panel")}</p>
          </div>
          <AdminStats />
          <ShowcaseManager />
        </div>
      )}

      {/* Saved offers counter */}
      <Link
        href="/favorites"
        className="fp-card fp-rise mt-4 flex items-center gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-fuchsia-600/25">
          <Heart className="h-5 w-5 fill-rose-400/80 text-rose-300" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{t("prof_saved_offers")}</p>
          <p className="text-xs text-white/40">
            {isGuest ? t("prof_saved_local") : t("prof_account")}
          </p>
        </div>
        <span className="font-display text-2xl font-extrabold text-white">{ids.length}</span>
        <ChevronRight className="h-4 w-4 text-white/30" />
      </Link>

      {/* Language selector */}
      <section className="fp-card fp-rise mt-4 rounded-3xl p-5">
        <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
          {t("prof_language")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code as Lang)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition active:scale-95",
                  active
                    ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
                )}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-fuchsia-300" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Preferences */}
      <section className="fp-card fp-rise mt-4 rounded-3xl p-5">
        <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
          {t("prof_prefs")}
        </h2>
        <p className="mb-3 text-sm text-white/55">{t("prof_fav_cats")}</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = prefCats.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95",
                  active
                    ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"
                )}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {t(`cat_${c}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Legal */}
      <section className="fp-card fp-rise mt-4 overflow-hidden rounded-3xl">
        <h2 className="px-5 pb-2 pt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
          {t("prof_legal")}
        </h2>
        <ul className="divide-y divide-white/5">
          {LEGAL_LINKS.map(({ href, key, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Icon className="h-4 w-4 text-white/35" />
                <span className="flex-1">{t(key)}</span>
                <ChevronRight className="h-4 w-4 text-white/25" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
        <p className="text-[11px] leading-relaxed text-white/40">{t("prof_age_warning")}</p>
        <p className="mt-2 text-[11px] font-semibold text-white/25">
          FlirtPulse · 18+
        </p>
      </footer>
    </div>
  );
}
