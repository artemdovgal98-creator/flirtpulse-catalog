"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Loader2, Lock, ShieldCheck, Unlock } from "lucide-react";
import { toast } from "sonner";
import { api, setAdminToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { AdminStats } from "@/components/admin/AdminStats";
import { ShowcaseManager } from "@/components/admin/ShowcaseManager";

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

  useEffect(() => {
    api.get<{ isAdmin: boolean }>("/api/admin/me").then((res) => {
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
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
          <p className="text-xs font-bold text-emerald-200">{t("admin_open_panel")}</p>
          <button
            type="button"
            onClick={lock}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:text-white active:scale-95"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("admin_lock")}
          </button>
        </div>
        <AdminStats />
        <ShowcaseManager />
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
