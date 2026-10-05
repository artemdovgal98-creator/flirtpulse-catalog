"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MessageSquareText, ThumbsUp, ThumbsDown, Check, EyeOff, Trash2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PanelHeader, Chip, Loading, Empty, ghostBtn, dangerIconBtn, formatDate, errorText } from "./panelKit";

const FILTERS = ["pending", "approved", "hidden", "all"] as const;
type Filter = (typeof FILTERS)[number];
const PAGE = 30;

interface ReviewItem {
  _id: string;
  offer_id: string;
  offer_name: string;
  author_name: string;
  vote: string;
  comment: string;
  status: string;
  language: string;
  submitted_at: string | null;
}

interface ListResponse {
  items: ReviewItem[];
  total: number;
  hasMore: boolean;
  counts: Record<string, number>;
}

/** Review moderation: approve, hide or delete. */
export function ReviewsPanel() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const fetchPage = useCallback(
    async (offset: number) => {
      const res = await api.get<ListResponse>(`/api/admin/reviews?status=${filter}&offset=${offset}&limit=${PAGE}`);
      if (!res.ok || !res.data) {
        console.error("[reviews] load failed:", res.error);
        toast.error(errorText(res.error, t));
        return null;
      }
      return res.data;
    },
    [filter, t]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchPage(0);
    if (data) {
      setItems(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCounts(data.counts);
      console.log(`[reviews] ${filter}: ${data.items.length}/${data.total}`);
    }
    setLoading(false);
  }, [fetchPage, filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function more() {
    setBusy("more");
    const data = await fetchPage(items.length);
    setBusy("");
    if (!data) return;
    setItems((prev) => [...prev, ...data.items]);
    setHasMore(data.hasMore);
  }

  async function setStatus(r: ReviewItem, status: "approved" | "hidden" | "pending") {
    setBusy(r._id);
    const res = await api.put(`/api/admin/reviews/${r._id}`, { status });
    setBusy("");
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t(`a2_review_${status}_done`));
    setCounts((c) => ({ ...c, [r.status]: Math.max(0, (c[r.status] ?? 1) - 1), [status]: (c[status] ?? 0) + 1 }));
    if (filter === "all") setItems((prev) => prev.map((x) => (x._id === r._id ? { ...x, status } : x)));
    else {
      setItems((prev) => prev.filter((x) => x._id !== r._id));
      setTotal((n) => Math.max(0, n - 1));
    }
  }

  async function remove(r: ReviewItem) {
    if (!window.confirm(t("a2_confirm_delete"))) return;
    setBusy(r._id);
    const res = await api.delete(`/api/admin/reviews/${r._id}`);
    setBusy("");
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t("a2_deleted"));
    setItems((prev) => prev.filter((x) => x._id !== r._id));
    setCounts((c) => ({ ...c, [r.status]: Math.max(0, (c[r.status] ?? 1) - 1) }));
    setTotal((n) => Math.max(0, n - 1));
  }

  const tone = (s: string) => (s === "approved" ? "ok" : s === "hidden" ? "bad" : "warn");

  return (
    <section className="mt-6 space-y-4">
      <PanelHeader icon={<MessageSquareText className="h-5 w-5" />} title={t("a2_reviews_title")} subtitle={t("a2_reviews_sub")} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition active:scale-95",
              filter === f ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white" : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            )}
          >
            {t(`a2_review_status_${f}`)}
            {f !== "all" && <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{counts[f] ?? 0}</span>}
          </button>
        ))}
        {!loading && <span className="ml-auto self-center text-[11px] font-bold text-white/35">{items.length} / {total}</span>}
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text={t("a2_reviews_empty")} />
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r._id} className="fp-card space-y-2 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    r.vote === "up" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  )}
                  aria-label={r.vote}
                >
                  {r.vote === "up" ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{r.offer_name || t("a2_review_deleted_offer")}</p>
                  <p className="text-[11px] text-white/40">
                    {r.author_name || t("a2_review_anonymous")} · {formatDate(r.submitted_at)}
                    {r.language && ` · ${r.language.toUpperCase()}`}
                  </p>
                </div>
                <Chip tone={tone(r.status)}>{t(`a2_review_status_${r.status}`)}</Chip>
              </div>
              {r.comment ? (
                <p className="whitespace-pre-line rounded-2xl bg-white/[0.03] p-3 text-sm text-white/75">{r.comment}</p>
              ) : (
                <p className="text-xs italic text-white/30">{t("a2_review_no_comment")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <button type="button" onClick={() => setStatus(r, "approved")} disabled={busy === r._id} className={ghostBtn + " border-emerald-400/30 text-emerald-200"}>
                    {busy === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {t("a2_review_approve")}
                  </button>
                )}
                {r.status !== "hidden" && (
                  <button type="button" onClick={() => setStatus(r, "hidden")} disabled={busy === r._id} className={ghostBtn}>
                    <EyeOff className="h-3.5 w-3.5" />
                    {t("a2_review_hide")}
                  </button>
                )}
                {r.status !== "pending" && (
                  <button type="button" onClick={() => setStatus(r, "pending")} disabled={busy === r._id} className={ghostBtn}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("a2_review_to_pending")}
                  </button>
                )}
                <button type="button" onClick={() => remove(r)} disabled={busy === r._id} aria-label={t("a2_delete")} className={dangerIconBtn + " ml-auto"}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <button type="button" onClick={more} disabled={busy === "more"} className={ghostBtn + " mx-auto flex px-6 py-2.5 text-sm"}>
          {busy === "more" && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("a2_load_more")}
        </button>
      )}
    </section>
  );
}
