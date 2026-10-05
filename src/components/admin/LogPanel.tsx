"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Btn, Empty, PanelTitle, Select, Spinner, fmtDate } from "@/components/admin/adminKit";

interface LogItem {
  _id: string;
  action: string;
  entity: string;
  entity_id: string;
  summary: string;
  details: Record<string, any>;
  actor: string;
  ip_address?: string;
  logged_at: string;
}

interface LogResponse {
  items: LogItem[];
  total: number;
  hasMore: boolean;
}

const ENTITIES = [
  "offer", "catalog_category", "affiliate_network", "ad_tag", "ticker_item", "notification",
  "review", "ui_translation", "app_setting", "admin_user", "click", "file", "admin_session",
];
const PAGE = 30;

function actionTone(action: string): string {
  if (/delete|archive|reset|blocked|disable/.test(action)) return "bg-rose-500/15 text-rose-200";
  if (/create|restore|grant|publish/.test(action)) return "bg-emerald-400/15 text-emerald-200";
  if (/update|edit|settings|role/.test(action)) return "bg-indigo-500/15 text-indigo-200";
  return "bg-white/10 text-white/60";
}

/** Admin journal (admin_log), newest first. */
export function LogPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [entity, setEntity] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const url = useCallback(
    (offset: number) => {
      const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
      if (entity) p.set("entity", entity);
      if (q.trim()) p.set("q", q.trim());
      return `/api/admin/log?${p}`;
    },
    [entity, q]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<LogResponse>(url(0));
    setLoading(false);
    if (!res.ok || !res.data) {
      console.error("[log] load failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setItems(res.data.items);
    setTotal(res.data.total);
    setHasMore(res.data.hasMore);
  }, [url]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function more() {
    setLoadingMore(true);
    const res = await api.get<LogResponse>(url(items.length));
    setLoadingMore(false);
    if (!res.ok || !res.data) {
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setItems((prev) => [...prev, ...res.data!.items]);
    setHasMore(res.data.hasMore);
  }

  return (
    <section className="space-y-4">
      <PanelTitle title={t("ap_tab_log")}>
        <Btn onClick={load} loading={loading} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          {t("ap_refresh")}
        </Btn>
      </PanelTitle>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("ap_log_search")}
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-fuchsia-400/60"
          />
        </div>
        <Select value={entity} onChange={setEntity} ariaLabel={t("ap_log_entity")}>
          <option value="">{t("ap_log_all")}</option>
          {ENTITIES.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-[11px] font-bold text-white/35">{t("ap_log_total", { n: total })}</p>

      {loading && !items.length ? (
        <Spinner />
      ) : !items.length ? (
        <Empty>{t("ap_log_empty")}</Empty>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => {
            const expanded = open === it._id;
            const hasDetails = it.details && Object.keys(it.details).length > 0;
            return (
              <li key={it._id} className="fp-card rounded-2xl p-3">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : it._id)}
                  className="flex w-full items-start gap-2 text-left"
                >
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold", actionTone(it.action))}>
                    {it.action}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-white/85">{it.summary}</span>
                    <span className="mt-0.5 block text-[11px] text-white/35">
                      {fmtDate(it.logged_at)} · {it.actor || "—"} · {it.entity}
                      {it.ip_address ? ` · ${it.ip_address}` : ""}
                    </span>
                  </span>
                  {hasDetails && (
                    <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-white/30 transition", expanded && "rotate-180")} />
                  )}
                </button>
                {expanded && hasDetails && (
                  <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-black/30 p-2.5 text-[11px] leading-relaxed text-white/60">
                    {JSON.stringify(it.details, null, 2)}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={more}
          disabled={loadingMore}
          className="mx-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-white/75 hover:text-white disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_load_more")}
        </button>
      )}
    </section>
  );
}
