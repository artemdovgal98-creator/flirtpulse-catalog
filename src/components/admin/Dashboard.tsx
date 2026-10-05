"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, MousePointerClick, RefreshCw, Target, TrendingUp, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AdminStats } from "@/components/admin/AdminStats";
import { Btn, Card, Chip, Label, Select, Spinner, fmtMoney, fmtNumber, smallInputCls } from "@/components/admin/adminKit";

interface Bucket {
  key: string;
  label: string;
  clicks: number;
  unique: number;
  conversions: number;
  approved: number;
  revenue: number;
  pending_revenue: number;
  epc: number;
  cr: number;
}

interface DashboardData {
  range: { from: string; to: string };
  currency: string;
  totals: Bucket & { conversionsByStatus: Record<string, number> };
  byNetwork: Bucket[];
  byCategory: Bucket[];
  byGeo: Bucket[];
  topOffers: Bucket[];
  series: Array<Bucket & { day: string }>;
  options: {
    networks: Array<{ _id: string; name: string }>;
    categories: Array<{ key: string; label: string; emoji: string }>;
    geos: string[];
  };
}

type Metric = "clicks" | "unique" | "approved" | "revenue";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

const PRESETS = [7, 30, 90] as const;

/** Affiliate dashboard: clicks, conversions, revenue, EPC, CR — all computed by /api/admin/dashboard. */
export function Dashboard() {
  const { t } = useI18n();
  const [days, setDays] = useState<number | null>(30);
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [network, setNetwork] = useState("");
  const [category, setCategory] = useState("");
  const [geo, setGeo] = useState("");
  const [metric, setMetric] = useState<Metric>("clicks");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (network) params.set("network", network);
    if (category) params.set("category", category);
    if (geo) params.set("geo", geo);
    const res = await api.get<DashboardData>(`/api/admin/dashboard?${params}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      console.error("[dashboard] load failed:", res.error);
      toast.error(res.error === "Forbidden" ? t("admin_session_expired") : String(res.error ?? "Error"));
      return;
    }
    setData(res.data);
    console.log(`[dashboard] ${res.data.range.from}..${res.data.range.to}: clicks=${res.data.totals.clicks} revenue=${res.data.totals.revenue}`);
  }, [from, to, network, category, geo, t]);

  useEffect(() => {
    load();
  }, [load]);

  function preset(n: number) {
    setDays(n);
    setFrom(isoDay(new Date(Date.now() - (n - 1) * 86400_000)));
    setTo(isoDay(new Date()));
  }

  const currency = data?.currency || "USD";
  const totals = data?.totals;

  return (
    <section className="space-y-4">
      {/* Filters — one row above the charts */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((n) => (
            <Chip key={n} active={days === n} onClick={() => preset(n)}>
              {t("ap_last_days", { n })}
            </Chip>
          ))}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              max={to}
              aria-label={t("ap_from")}
              onChange={(e) => {
                setDays(null);
                setFrom(e.target.value);
              }}
              className={cn(smallInputCls, "[color-scheme:dark]")}
            />
            <span className="text-white/30">—</span>
            <input
              type="date"
              value={to}
              min={from}
              aria-label={t("ap_to")}
              onChange={(e) => {
                setDays(null);
                setTo(e.target.value);
              }}
              className={cn(smallInputCls, "[color-scheme:dark]")}
            />
          </div>
          <Btn className="ml-auto" onClick={load} loading={loading} icon={<RefreshCw className="h-3.5 w-3.5" />}>
            {t("ap_refresh")}
          </Btn>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={network} onChange={setNetwork} ariaLabel={t("ap_network")}>
            <option value="">{t("ap_all_networks")}</option>
            {data?.options.networks.map((n) => (
              <option key={n._id} value={n._id}>
                {n._id === "direct" ? t("ap_direct") : n.name}
              </option>
            ))}
          </Select>
          <Select value={category} onChange={setCategory} ariaLabel={t("ap_category")}>
            <option value="">{t("admin_all_categories")}</option>
            {data?.options.categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.emoji} {c.label}
              </option>
            ))}
          </Select>
          <Select value={geo} onChange={setGeo} ariaLabel={t("ap_geo")}>
            <option value="">{t("ap_all_geos")}</option>
            {data?.options.geos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!data && loading ? (
        <Spinner />
      ) : !data || !totals ? null : (
        <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={<MousePointerClick className="h-4 w-4" />} label={t("ap_clicks")} value={fmtNumber(totals.clicks)} />
            <Kpi icon={<Users className="h-4 w-4" />} label={t("ap_unique_clicks")} value={fmtNumber(totals.unique)} />
            <Kpi
              icon={<Target className="h-4 w-4" />}
              label={t("ap_conversions")}
              value={fmtNumber(totals.approved)}
              sub={t("ap_of_total", { n: totals.conversions })}
            />
            <Kpi
              icon={<Wallet className="h-4 w-4" />}
              label={t("ap_revenue")}
              value={fmtMoney(totals.revenue, currency)}
              sub={`${t("ap_pending")}: ${fmtMoney(totals.pending_revenue, currency)}`}
              accent
            />
            <Kpi icon={<TrendingUp className="h-4 w-4" />} label="EPC" value={fmtMoney(totals.epc, currency)} />
            <Kpi icon={<BarChart3 className="h-4 w-4" />} label="CR" value={`${fmtNumber(totals.cr, 2)}%`} />
          </div>

          {/* Conversion statuses */}
          <Card>
            <Label>{t("ap_conversions_by_status")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["approved", "pending", "pending_pricing", "rejected"] as const).map((s) => (
                <div key={s} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[11px] font-bold text-white/45">{t(`ap_conv_${s}`)}</p>
                  <p className="font-display text-lg font-extrabold text-white">
                    {fmtNumber(totals.conversionsByStatus[s] || 0)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Daily series */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Label>{t("ap_by_day")}</Label>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {(["clicks", "unique", "approved", "revenue"] as Metric[]).map((m) => (
                  <Chip key={m} active={metric === m} onClick={() => setMetric(m)} className="px-2.5 py-1 text-[11px]">
                    {t(`ap_metric_${m}`)}
                  </Chip>
                ))}
              </div>
            </div>
            <DailyBars series={data.series} metric={metric} currency={currency} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <SliceCard title={t("ap_by_network")} rows={data.byNetwork} currency={currency} directLabel={t("ap_direct")} />
            <SliceCard title={t("ap_by_category")} rows={data.byCategory} currency={currency} />
            <SliceCard title={t("ap_by_geo")} rows={data.byGeo} currency={currency} />
            <SliceCard title={t("ap_top_offers")} rows={data.topOffers} currency={currency} />
          </div>
        </div>
      )}

      {/* Live audience overview (users online, recent clicks) */}
      <AdminStats />
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "fp-card rounded-2xl p-3.5",
        accent && "border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10"
      )}
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-white/45">
        <span className="text-fuchsia-300">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate font-display text-xl font-extrabold text-white">{value}</p>
      {sub && <p className="truncate text-[10px] text-white/35">{sub}</p>}
    </div>
  );
}

function DailyBars({
  series,
  metric,
  currency,
}: {
  series: Array<Bucket & { day: string }>;
  metric: Metric;
  currency: string;
}) {
  const { t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...series.map((s) => s[metric] || 0)), [series, metric]);
  const format = (v: number) => (metric === "revenue" ? fmtMoney(v, currency) : fmtNumber(v));
  const active = hover != null ? series[hover] : null;

  if (!series.length) return <p className="text-sm text-white/35">{t("ap_no_data")}</p>;

  return (
    <div>
      <div className="mb-2 h-5 text-xs text-white/60">
        {active ? (
          <span>
            <b className="text-white">{active.day}</b> · {t(`ap_metric_${metric}`)}: <b className="text-white">{format(active[metric])}</b>
            {metric !== "clicks" && ` · ${t("ap_clicks")}: ${fmtNumber(active.clicks)}`}
          </span>
        ) : (
          <span className="text-white/35">
            {t("ap_max")}: {format(max)}
          </span>
        )}
      </div>
      <div className="flex h-36 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
        {series.map((s, i) => {
          const v = s[metric] || 0;
          const h = v ? Math.max(3, (v / max) * 100) : 0;
          return (
            <button
              key={s.day}
              type="button"
              aria-label={`${s.day}: ${format(v)}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              className="group relative flex h-full min-w-0 flex-1 items-end"
            >
              <span
                className={cn(
                  "w-full rounded-t-[4px] bg-gradient-to-t from-fuchsia-600 to-fuchsia-400 transition-opacity",
                  hover != null && hover !== i && "opacity-40"
                )}
                style={{ height: `${h}%` }}
              />
              {!v && <span className="absolute bottom-0 h-px w-full bg-white/10" />}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
        <span>{series[0]?.day}</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  );
}

function SliceCard({
  title,
  rows,
  currency,
  directLabel,
}: {
  title: string;
  rows: Bucket[];
  currency: string;
  directLabel?: string;
}) {
  const { t } = useI18n();
  const max = Math.max(1, ...rows.map((r) => r.clicks));
  return (
    <Card>
      <Label>{title}</Label>
      {!rows.length ? (
        <p className="text-sm text-white/35">{t("ap_no_data")}</p>
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/35">
                <th className="px-1 py-1.5 font-bold">{t("ap_name")}</th>
                <th className="px-1 py-1.5 text-right font-bold">{t("ap_clicks")}</th>
                <th className="px-1 py-1.5 text-right font-bold">{t("ap_conv_short")}</th>
                <th className="px-1 py-1.5 text-right font-bold">{t("ap_revenue")}</th>
                <th className="px-1 py-1.5 text-right font-bold">EPC</th>
                <th className="px-1 py-1.5 text-right font-bold">CR</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => (
                <tr key={r.key} className="border-t border-white/5">
                  <td className="max-w-[180px] px-1 py-2">
                    <p className="truncate font-bold text-white/85">
                      {r.key === "direct" && directLabel ? directLabel : r.label}
                    </p>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/5">
                      <span
                        className="block h-full rounded-full bg-fuchsia-400"
                        style={{ width: `${(r.clicks / max) * 100}%` }}
                      />
                    </span>
                  </td>
                  <td className="px-1 py-2 text-right tabular-nums text-white/80">{fmtNumber(r.clicks)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-white/80">{fmtNumber(r.approved)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-white">{fmtMoney(r.revenue, currency)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-white/60">{fmtNumber(r.epc, 3)}</td>
                  <td className="px-1 py-2 text-right tabular-nums text-white/60">{fmtNumber(r.cr, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
