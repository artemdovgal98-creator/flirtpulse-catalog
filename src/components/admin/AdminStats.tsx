"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Users, MousePointerClick, Radio, LayoutGrid, CalendarDays, UserPlus,
  RefreshCw, Loader2, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { CATEGORY_DOT } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const REFRESH_MS = 15_000;

interface StatsPayload {
  totalUsers: number;
  newUsers: number;
  totalClicks: number;
  clicksToday: number;
  clicksWeek: number;
  showcases: number;
  customShowcases: number;
  onlineNow: number;
  top: Array<{ _id: string; name: string; click_count?: number; category?: string[] }>;
  recent: Array<{ _id: string; clicked_at?: string; offer_name: string; language?: string; visitor_id?: string }>;
  history: Array<{ day: string; clicks: number }>;
  generatedAt: string;
}

function StatCard({
  label, value, hint, Icon, accent, live,
}: {
  label: string;
  value: number | string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
  live?: boolean;
}) {
  return (
    <div className="fp-card relative overflow-hidden rounded-3xl p-4">
      <div className={cn("pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl", accent)} />
      <div className="relative flex items-start justify-between gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.06] text-white/80">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {live && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            live
          </span>
        )}
      </div>
      <p className="relative mt-3 font-display text-2xl font-extrabold leading-none text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="relative mt-1 text-[12px] font-semibold text-white/55">{label}</p>
      {hint && <p className="relative mt-0.5 text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}

/** Live analytics panel: users, clicks and who is browsing right now. */
export function AdminStats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await api.get<StatsPayload>("/api/admin/stats");
    if (res.ok && res.data) {
      setStats(res.data);
      setError(null);
      console.log("[admin] stats refreshed:", res.data.totalClicks, "clicks,", res.data.onlineNow, "online");
    } else {
      console.error("[admin] stats request failed:", res.error);
      setError(String(res.error ?? "Error"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="fp-card flex h-40 items-center justify-center rounded-3xl">
        <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (!stats) {
    return <div className="fp-card rounded-3xl p-6 text-center text-sm text-rose-300">{error}</div>;
  }

  const s = stats;
  const peak = Math.max(1, ...s.history.map((h) => h.clicks));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-white">{t("admin_title")}</h2>
          <p className="text-xs text-white/40">{t("admin_subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            {t("admin_refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label={t("admin_users")} value={s.totalUsers} Icon={Users} accent="bg-fuchsia-500/25" />
        <StatCard label={t("admin_online")} value={s.onlineNow} Icon={Radio} accent="bg-emerald-500/25" live />
        <StatCard label={t("admin_clicks")} value={s.totalClicks} Icon={MousePointerClick} accent="bg-indigo-500/25" />
        <StatCard label={t("admin_clicks_today")} value={s.clicksToday} Icon={CalendarDays} accent="bg-cyan-500/25" />
        <StatCard label={t("admin_new_users")} value={s.newUsers} Icon={UserPlus} accent="bg-violet-500/25" />
        <StatCard
          label={t("admin_showcases")}
          value={s.showcases}
          hint={`+${s.customShowcases}`}
          Icon={LayoutGrid}
          accent="bg-rose-500/25"
        />
      </div>

      <section className="fp-card rounded-3xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-fuchsia-300" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-white/40">
            {t("admin_last_7_days")}
          </h3>
          <span className="ml-auto font-display text-sm font-extrabold text-white">
            {s.clicksWeek.toLocaleString()}
          </span>
        </div>
        <div className="flex h-28 items-end gap-2">
          {s.history.map((h) => (
            <div key={h.day} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-white/40">{h.clicks || ""}</span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500/40 to-fuchsia-400/80 transition-all"
                style={{ height: `${Math.max(4, (h.clicks / peak) * 100)}%` }}
                title={`${h.day}: ${h.clicks}`}
              />
              <span className="text-[10px] font-semibold text-white/30">{h.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="fp-card overflow-hidden rounded-3xl">
          <h3 className="px-5 pb-2 pt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
            {t("admin_top")}
          </h3>
          {s.top.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-white/35">{t("admin_no_clicks")}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {s.top.map((o, i) => (
                <li key={o._id} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-display w-5 text-sm font-extrabold text-white/25">{i + 1}</span>
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", CATEGORY_DOT[o.category?.[0] ?? "dating"])}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/80">{o.name}</span>
                  <span className="font-display text-sm font-extrabold text-fuchsia-300">
                    {(o.click_count ?? 0).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fp-card overflow-hidden rounded-3xl">
          <h3 className="px-5 pb-2 pt-5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
            {t("admin_recent")}
          </h3>
          {s.recent.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-white/35">{t("admin_no_clicks")}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {s.recent.map((c) => (
                <li key={c._id} className="flex items-center gap-3 px-5 py-3">
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-white/25" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/75">
                    {c.offer_name}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold uppercase text-white/30">
                    {c.language || "—"}
                  </span>
                  <span className="shrink-0 text-[11px] text-white/30">
                    {c.clicked_at
                      ? new Date(c.clicked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-[11px] text-white/25">
        {t("admin_updated_at")}: {new Date(s.generatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
