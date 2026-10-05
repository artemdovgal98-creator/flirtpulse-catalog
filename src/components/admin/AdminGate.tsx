"use client";

import React, { useEffect, useState } from "react";
import {
  Bell, FileText, FolderTree, KeyRound, Languages, LayoutDashboard, Loader2, Lock, Megaphone, MessageSquare,
  Network, Rss, Settings, ShieldCheck, Store, Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { api, setAdminToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Dashboard } from "@/components/admin/Dashboard";
import { ShowcasesPanel } from "@/components/admin/ShowcasesPanel";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
import { LogPanel } from "@/components/admin/LogPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { NetworksPanel } from "@/components/admin/NetworksPanel";
import { AdsPanel } from "@/components/admin/AdsPanel";
import { TickerPanel } from "@/components/admin/TickerPanel";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { ReviewsPanel } from "@/components/admin/ReviewsPanel";
import { TranslationsPanel } from "@/components/admin/TranslationsPanel";

const TABS = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "showcases", icon: Store },
  { key: "categories", icon: FolderTree },
  { key: "networks", icon: Network },
  { key: "ads", icon: Megaphone },
  { key: "ticker", icon: Rss },
  { key: "notifications", icon: Bell },
  { key: "reviews", icon: MessageSquare },
  { key: "translations", icon: Languages },
  { key: "log", icon: FileText },
  { key: "settings", icon: Settings },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const TAB_STORAGE = "fp_admin_tab";

/**
 * Password gate for the admin dashboard.
 *
 * The password is checked by `/api/admin/unlock`, which answers with a signed
 * httpOnly cookie. The client never holds the password or the secret, and every
 * admin API route re-validates that cookie server-side — hiding the UI is only
 * the presentation layer, not the security boundary.
 */
export function AdminGate() {
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE) as TabKey | null;
      if (saved && TABS.some((x) => x.key === saved)) setTab(saved);
    } catch {
      /* storage unavailable (private mode) — default tab is fine */
    }
  }, []);

  function selectTab(next: TabKey) {
    setTab(next);
    try {
      window.localStorage.setItem(TAB_STORAGE, next);
    } catch (err) {
      console.error("[admin-gate] could not persist the tab:", err);
    }
    console.log("[admin-gate] tab:", next);
  }

  const refreshMe = React.useCallback(async () => {
    const res = await api.get<{ isAdmin: boolean; canManage?: boolean; role?: string | null }>("/api/admin/me");
    setCanManage(Boolean(res.ok && res.data?.canManage));
    setRole(res.data?.role ?? null);
    return res;
  }, []);

  useEffect(() => {
    refreshMe().then((res) => {
      const isAdmin = Boolean(res.ok && res.data?.isAdmin);
      // A stored token the server no longer accepts is dead weight — drop it so
      // the password form is shown instead of a panel that answers "Forbidden".
      if (!isAdmin) setAdminToken("");
      setUnlocked(isAdmin);
      setChecking(false);
      console.log("[admin-gate] panel unlocked:", isAdmin);
    });
  }, []);

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    if (!password.trim() || submitting) return;

    setSubmitting(true);
    setError(false);
    const res = await api.post<{ unlocked: boolean; token?: string }>(
      "/api/admin/unlock",
      { password }
    );
    setSubmitting(false);

    if (!res.ok) {
      console.error("[admin-gate] unlock rejected:", res.error);
      setError(true);
      toast.error(t("admin_wrong_password"));
      return;
    }

    // Mirror of the httpOnly cookie — replayed as `x-admin-token` so the panel
    // also works inside the Totalum preview iframe, where cookies are blocked.
    setAdminToken(res.data?.token ?? "");

    setPassword("");
    await refreshMe();
    setUnlocked(true);
    setOpen(false);
    toast.success(t("admin_unlocked_toast"));
    console.log("[admin-gate] admin panel unlocked");
  }

  async function lock() {
    const res = await api.delete("/api/admin/unlock");
    // The token mirror must go even if the server call fails, otherwise the
    // browser would keep re-authenticating itself with the stored header.
    setAdminToken("");
    if (!res.ok) {
      console.error("[admin-gate] lock failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setUnlocked(false);
    toast.success(t("admin_locked_toast"));
    console.log("[admin-gate] admin panel locked");
  }

  if (checking) {
    return (
      <div className="fp-card mt-5 flex h-16 items-center justify-center rounded-3xl">
        <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (unlocked) {
    return (
      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
          <p className="text-xs font-bold text-emerald-200">{t("admin_open_panel")}</p>
          {role && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white/60">
              {t(`ap_role_${role}`)}
            </span>
          )}
          <button
            type="button"
            onClick={lock}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:text-white active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("admin_lock")}
          </button>
        </div>

        <nav
          aria-label={t("ap_tabs")}
          className="sticky top-0 z-30 -mx-4 mb-4 overflow-x-auto border-b border-white/5 bg-[#0d0a18]/80 px-4 py-2 backdrop-blur-xl [scrollbar-width:none] sm:mx-0 sm:rounded-2xl sm:border sm:border-white/10 sm:px-2"
        >
          <div className="flex w-max gap-1.5">
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-95",
                  tab === key
                    ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-[0_8px_24px_-12px_rgba(217,70,239,0.9)]"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`ap_tab_${key}`)}
              </button>
            ))}
          </div>
        </nav>

        <div key={tab} className="fp-rise">
          {tab === "dashboard" && <Dashboard />}
          {tab === "showcases" && <ShowcasesPanel canManage={canManage} />}
          {tab === "categories" && <CategoriesPanel canManage={canManage} />}
          {tab === "networks" && <NetworksPanel />}
          {tab === "ads" && <AdsPanel />}
          {tab === "ticker" && <TickerPanel />}
          {tab === "notifications" && <NotificationsPanel />}
          {tab === "reviews" && <ReviewsPanel />}
          {tab === "translations" && <TranslationsPanel />}
          {tab === "log" && <LogPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </div>
    );
  }

  return (
    <section className="fp-card fp-rise mt-5 overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-white/[0.04]"
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/25 to-fuchsia-600/25">
          <Lock className="h-4 w-4 text-fuchsia-200" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{t("admin_locked_title")}</span>
          <span className="block truncate text-xs text-white/40">{t("admin_locked_desc")}</span>
        </span>
        <Unlock className="h-4 w-4 shrink-0 text-white/30" />
      </button>

      {open && (
        <form onSubmit={unlock} className="space-y-3 border-t border-white/5 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              <KeyRound className="h-3 w-3" />
              {t("admin_password")}
            </span>
            <input
              type="password"
              value={password}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
              className={
                "w-full rounded-2xl border bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 " +
                (error
                  ? "border-rose-400/60 focus:border-rose-400"
                  : "border-white/10 focus:border-fuchsia-400/60")
              }
            />
          </label>

          {error && <p className="text-xs font-bold text-rose-300">{t("admin_wrong_password")}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              {submitting ? t("admin_unlocking") : t("admin_unlock")}
            </button>
            <span className="text-[11px] text-white/30">{t("admin_session_hint")}</span>
          </div>
        </form>
      )}
    </section>
  );
}
