"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Archive, ArchiveRestore, CheckSquare, Eye, Image as ImageIcon, Link2, Link2Off, Loader2, Pencil, Plus, Search,
  Send, Square, Star, StarOff, ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COLOR_DOT, offerImages, type AdminOffer } from "@/lib/catalog";
import { Btn, Chip, Empty, PanelTitle, Select, Spinner, StatusPill, fmtNumber } from "@/components/admin/adminKit";
import {
  EMPTY_FORM, FORM_STATUSES, ShowcaseForm, formFromOffer,
  type AdminCategory, type AdminNetwork, type ShowcaseFormState,
} from "@/components/admin/ShowcaseForm";

const PAGE_SIZE = 30;
const SORTS = ["newest", "updated", "name", "clicks", "cr", "revenue"] as const;
type BulkAction = "publish" | "review" | "draft" | "archive" | "restore" | "top" | "untop";

interface OfferStats {
  clicks: number;
  conversions: number;
  approved: number;
  revenue: number;
  pending_revenue: number;
  cr: number;
  epc: number;
}

type Row = AdminOffer & { stats?: OfferStats };

interface ListResponse {
  items: Row[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/** Showcase management: filters, server-side sorting by performance, bulk actions and the editor. */
export function ShowcasesPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("");
  const [network, setNetwork] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("newest");
  const [featured, setFeatured] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState<BulkAction | null>(null);
  const [form, setForm] = useState<ShowcaseFormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [networks, setNetworks] = useState<AdminNetwork[]>([]);

  useEffect(() => {
    api.get<{ items: AdminCategory[] }>("/api/admin/categories").then((res) => {
      if (res.ok && res.data) setCategories(res.data.items);
      else console.error("[showcases] categories failed:", res.error);
    });
    api.get<{ items: AdminNetwork[] }>("/api/admin/networks").then((res) => {
      if (res.ok && res.data) setNetworks(res.data.items || []);
      else console.error("[showcases] networks failed:", res.error);
    });
  }, []);

  const buildParams = useCallback(
    (offset: number) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      p.set("status", status);
      if (category) p.set("category", category);
      if (network) p.set("network", network);
      if (featured) p.set("featured", "1");
      p.set("sort", sort);
      p.set("offset", String(offset));
      p.set("limit", String(PAGE_SIZE));
      return p;
    },
    [q, status, category, network, featured, sort]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<ListResponse>(`/api/admin/showcases?${buildParams(0)}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      console.error("[showcases] list failed:", res.error);
      toast.error(res.error === "Forbidden" ? t("admin_session_expired") : String(res.error ?? "Error"));
      return;
    }
    setItems(res.data.items);
    setTotal(res.data.total);
    setHasMore(res.data.hasMore);
    setSelected([]);
    console.log(`[showcases] loaded ${res.data.items.length}/${res.data.total}`);
  }, [buildParams, t]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const res = await api.get<ListResponse>(`/api/admin/showcases?${buildParams(items.length)}`);
    setLoadingMore(false);
    if (!res.ok || !res.data) {
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setItems((prev) => [...prev, ...res.data!.items]);
    setTotal(res.data.total);
    setHasMore(res.data.hasMore);
  }

  function openForm(state: ShowcaseFormState) {
    setForm(state);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function bulk(action: BulkAction, ids = selected) {
    if (!ids.length) return;
    if (action === "archive" && !window.confirm(t("ap_confirm_archive", { n: ids.length }))) return;
    setBulkBusy(action);
    const res = await api.post<{ updated: string[]; skipped: Array<{ id: string; name: string; failed: string[] }> }>(
      "/api/admin/showcases/bulk",
      { ids, action }
    );
    setBulkBusy(null);
    if (!res.ok || !res.data) {
      console.error("[showcases] bulk failed:", res.error);
      toast.error(res.error === "ADMIN_ROLE_REQUIRED" ? t("ap_admin_role_required") : String(res.error ?? "Error"));
      return;
    }
    const { updated, skipped } = res.data;
    toast.success(t("ap_bulk_done", { n: updated.length }));
    if (skipped.length) {
      toast.warning(
        `${t("ap_bulk_skipped", { n: skipped.length })}: ${skipped
          .slice(0, 3)
          .map((s) => `${s.name} (${s.failed.map((f) => t(`ap_check_${f}`)).join(", ")})`)
          .join("; ")}`
      );
    }
    console.log(`[showcases] bulk ${action}: updated=${updated.length} skipped=${skipped.length}`);
    load();
  }

  const allSelected = items.length > 0 && items.every((i) => selected.includes(i._id));
  const catOf = (key: string) => categories.find((c) => c.key === key);
  const netName = (v: AdminOffer["affiliate_network"]) => {
    const id = typeof v === "string" ? v : v?._id;
    return id ? networks.find((n) => n._id === id)?.name ?? "—" : t("ap_direct");
  };

  return (
    <section className="space-y-4">
      <PanelTitle title={t("admin_manage")}>
        <Btn variant="primary" onClick={() => openForm({ ...EMPTY_FORM })} icon={<Plus className="h-4 w-4" />}>
          {t("admin_add")}
        </Btn>
      </PanelTitle>

      {form && (
        <ShowcaseForm
          key={formKey}
          initial={form}
          categories={categories}
          networks={networks}
          canManage={canManage}
          onClose={() => setForm(null)}
          onSaved={(item, blocked) => {
            if (!blocked) setForm(null);
            load();
            console.log(`[showcases] saved ${item._id} blocked=${blocked}`);
          }}
        />
      )}

      {/* Status tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {["all", ...FORM_STATUSES].map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)} className="shrink-0">
            {s === "all" ? t("ap_status_all") : t(`ap_status_${s}`)}
          </Chip>
        ))}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="relative col-span-2 sm:col-span-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin_search")}
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60"
          />
        </div>
        <Select value={category} onChange={setCategory} ariaLabel={t("ap_category")}>
          <option value="">{t("admin_all_categories")}</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.emoji} {c.label}
            </option>
          ))}
        </Select>
        <Select value={network} onChange={setNetwork} ariaLabel={t("ap_network")}>
          <option value="">{t("ap_all_networks")}</option>
          <option value="none">{t("ap_direct")}</option>
          {networks.map((n) => (
            <option key={n._id} value={n._id}>
              {n.name}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(v) => setSort(v as (typeof SORTS)[number])} ariaLabel={t("ap_sort")}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(`ap_sort_${s}`)}
            </option>
          ))}
        </Select>
        <Chip active={featured} onClick={() => setFeatured((v) => !v)} className="justify-center">
          <Star className={cn("h-3.5 w-3.5", featured && "fill-current text-amber-300")} />
          {t("ap_top")}
        </Chip>
      </div>

      {/* Selection + bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected(allSelected ? [] : items.map((i) => i._id))}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white/55 hover:text-white"
        >
          {allSelected ? <CheckSquare className="h-4 w-4 text-fuchsia-300" /> : <Square className="h-4 w-4" />}
          {t("ap_select_all")}
        </button>
        {!loading && (
          <span className="ml-auto text-[11px] font-bold text-white/35">
            {items.length} {t("admin_of")} {total}
          </span>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fp-card sticky top-2 z-20 flex flex-wrap items-center gap-1.5 rounded-2xl border-fuchsia-400/30 p-2.5 backdrop-blur">
          <span className="px-1 text-xs font-extrabold text-white">{t("ap_selected", { n: selected.length })}</span>
          <Btn variant="success" loading={bulkBusy === "publish"} onClick={() => bulk("publish")} icon={<Send className="h-3.5 w-3.5" />} className="px-3 py-1.5">
            {t("ap_bulk_publish")}
          </Btn>
          <Btn variant="warning" loading={bulkBusy === "review"} onClick={() => bulk("review")} icon={<ClipboardCheck className="h-3.5 w-3.5" />} className="px-3 py-1.5">
            {t("ap_bulk_review")}
          </Btn>
          <Btn loading={bulkBusy === "top"} onClick={() => bulk("top")} icon={<Star className="h-3.5 w-3.5" />} className="px-3 py-1.5">
            {t("ap_bulk_top")}
          </Btn>
          <Btn loading={bulkBusy === "untop"} onClick={() => bulk("untop")} icon={<StarOff className="h-3.5 w-3.5" />} className="px-3 py-1.5">
            {t("ap_bulk_untop")}
          </Btn>
          {status === "archived" ? (
            <Btn loading={bulkBusy === "restore"} onClick={() => bulk("restore")} icon={<ArchiveRestore className="h-3.5 w-3.5" />} className="px-3 py-1.5">
              {t("ap_restore")}
            </Btn>
          ) : (
            canManage && (
              <Btn variant="danger" loading={bulkBusy === "archive"} onClick={() => bulk("archive")} icon={<Archive className="h-3.5 w-3.5" />} className="px-3 py-1.5">
                {t("ap_archive")}
              </Btn>
            )
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>{t("admin_empty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const cover = offerImages(item)[0];
            const checked = selected.includes(item._id);
            const st = item.status || "draft";
            const stats = item.stats;
            return (
              <li
                key={item._id}
                className={cn("fp-card flex gap-3 rounded-2xl p-3", checked && "border-fuchsia-400/40 bg-fuchsia-500/[0.06]")}
              >
                <button
                  type="button"
                  aria-label={t("ap_select")}
                  onClick={() => setSelected((prev) => (checked ? prev.filter((x) => x !== item._id) : [...prev, item._id]))}
                  className="shrink-0 self-center text-white/50 hover:text-white"
                >
                  {checked ? <CheckSquare className="h-5 w-5 text-fuchsia-300" /> : <Square className="h-5 w-5" />}
                </button>
                <span className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {cover && <img src={cover} alt={item.name} className="h-full w-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="min-w-0 truncate text-sm font-bold text-white">{item.name}</p>
                    <StatusPill status={st} label={t(`ap_status_${st}`)} />
                    {item.is_featured === "yes" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-200">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        {t("ap_top")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/40">
                    {(item.category ?? []).map((c) => {
                      const cat = catOf(c);
                      return (
                        <span key={c} className="inline-flex items-center gap-1">
                          <span className={cn("h-1.5 w-1.5 rounded-full", COLOR_DOT[cat?.color ?? ""] ?? "bg-white/30")} />
                          {cat ? cat.label : c}
                        </span>
                      );
                    })}
                    <span>· {netName(item.affiliate_network)}</span>
                    {item.geo?.length ? <span>· {item.geo.slice(0, 4).join(", ").toUpperCase()}{item.geo.length > 4 ? "…" : ""}</span> : null}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-indigo-200">
                      {fmtNumber(stats?.clicks ?? 0)} {t("admin_clicks_short")}
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-white/55">CR {fmtNumber(stats?.cr ?? 0, 2)}%</span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                      {t("ap_revenue")} {fmtNumber(stats?.revenue ?? 0, 2)}
                    </span>
                    {item.offer_url ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                        <Link2 className="h-3 w-3" />
                        {t("admin_has_link")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/35">
                        <Link2Off className="h-3 w-3" />
                        {t("admin_no_link")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/40">
                      <ImageIcon className="h-3 w-3" />
                      {(item.images ?? []).length}/3
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  {st === "active" && (
                    <a
                      href={`/offer/${item._id}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t("ap_view")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => openForm(formFromOffer(item))}
                    aria-label={t("admin_edit")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-fuchsia-400/40 hover:text-white active:scale-90"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {st === "archived" ? (
                    <button
                      type="button"
                      onClick={() => bulk("restore", [item._id])}
                      aria-label={t("ap_restore")}
                      title={t("ap_restore")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200 transition hover:bg-emerald-500/20 active:scale-90"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </button>
                  ) : (
                    canManage && (
                      <button
                        type="button"
                        onClick={() => bulk("archive", [item._id])}
                        aria-label={t("ap_archive")}
                        title={t("ap_archive")}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 active:scale-90"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-white/75 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95 disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_load_more")}
        </button>
      )}
    </section>
  );
}
