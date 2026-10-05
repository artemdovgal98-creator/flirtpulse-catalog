"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, Loader2, Clock, MessageSquare, LogIn, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX = 300;

interface ReviewItem {
  _id: string;
  vote: "up" | "down";
  comment: string;
  author_name: string;
  submitted_at?: string;
  mine?: boolean;
}

interface Mine {
  vote: "up" | "down";
  comment: string;
  status: string;
  pending: boolean;
}

interface ReviewsData {
  items: ReviewItem[];
  up: number;
  down: number;
  mine: Mine | null;
}

/** 👍/👎 summary, approved reviews and the review form (moderated). */
export function Reviews({ offerId }: { offerId: string }) {
  const { t, lang } = useI18n();
  const { data: session, isPending } = useSession();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [vote, setVote] = useState<"up" | "down" | "">("");
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    api.get<ReviewsData>(`/api/reviews?offerId=${encodeURIComponent(offerId)}`).then((res) => {
      if (res.ok && res.data) {
        setData(res.data);
        if (res.data.mine) {
          setVote(res.data.mine.vote);
          setComment(res.data.mine.comment);
        }
      } else {
        console.error("[reviews] could not load:", res.error);
        setData({ items: [], up: 0, down: 0, mine: null });
      }
    });
  }, [offerId]);

  useEffect(() => {
    if (!isPending) load();
  }, [load, isPending, session?.user?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vote) {
      toast.error(t("rev_pick_vote"));
      return;
    }
    setSending(true);
    const res = await api.post<{ mine: Mine }>("/api/reviews", { offerId, vote, comment: comment.trim(), lang });
    setSending(false);
    if (res.ok && res.data) {
      toast.success(t("rev_sent"));
      setData((d) => (d ? { ...d, mine: res.data!.mine } : d));
      setEditing(false);
      console.log(`[reviews] review sent for ${offerId}`);
      return;
    }
    const code = String(res.error || "");
    console.error("[reviews] submit failed:", code);
    toast.error(
      code === "links_not_allowed"
        ? t("rev_err_links")
        : code === "rate_limited"
          ? t("rev_err_rate")
          : code === "comment_too_long"
            ? t("rev_err_long")
            : code === "auth_required"
              ? t("rev_login")
              : t("eng_error")
    );
  }

  const up = data?.up ?? 0;
  const down = data?.down ?? 0;
  const total = up + down;
  const percent = total ? Math.round((up / total) * 100) : 0;
  const mine = data?.mine;
  const showForm = !!session?.user && (!mine || editing);

  return (
    <section className="fp-card fp-rise rounded-3xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-white">
          <MessageSquare className="h-5 w-5 text-fuchsia-300" />
          {t("rev_title")}
        </h2>
        <div className="flex items-center gap-3 text-sm font-bold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-200 ring-1 ring-inset ring-emerald-400/25">
            <ThumbsUp className="h-3.5 w-3.5" /> {up}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-rose-200 ring-1 ring-inset ring-rose-400/25">
            <ThumbsDown className="h-3.5 w-3.5" /> {down}
          </span>
        </div>
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div className="h-2 overflow-hidden rounded-full bg-rose-500/30">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-white/45">{t("rev_summary", { up, down })}</p>
        </div>
      )}

      {/* Own review status */}
      {mine && !editing && (
        <div
          className={cn(
            "mb-4 rounded-2xl border p-3.5",
            mine.status === "pending" ? "border-amber-400/30 bg-amber-400/10" : mine.status === "hidden" ? "border-rose-400/30 bg-rose-500/10" : "border-emerald-400/30 bg-emerald-400/10"
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-white/70">
              {mine.vote === "up" ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-300" /> : <ThumbsDown className="h-3.5 w-3.5 text-rose-300" />}
              {t("rev_your")}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 transition hover:text-white"
            >
              <Pencil className="h-3 w-3" />
              {t("rev_edit")}
            </button>
          </div>
          {mine.comment && <p className="text-sm text-white/80">{mine.comment}</p>}
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-white/55">
            {mine.status === "pending" && <Clock className="h-3 w-3" />}
            {mine.status === "pending" ? t("rev_pending") : mine.status === "hidden" ? t("rev_hidden") : t("rev_approved")}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVote("up")}
              aria-pressed={vote === "up"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition active:scale-95",
                vote === "up" ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100" : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
              )}
            >
              <ThumbsUp className="h-4 w-4" /> {t("rev_like")}
            </button>
            <button
              type="button"
              onClick={() => setVote("down")}
              aria-pressed={vote === "down"}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition active:scale-95",
                vote === "down" ? "border-rose-400/60 bg-rose-500/15 text-rose-100" : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
              )}
            >
              <ThumbsDown className="h-4 w-4" /> {t("rev_dislike")}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, MAX))}
              maxLength={MAX}
              rows={3}
              placeholder={t("rev_placeholder")}
              aria-label={t("rev_placeholder")}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-fuchsia-400/50"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-semibold text-white/35">
              {t("rev_chars", { n: comment.length, max: MAX })}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            {editing && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/55 hover:text-white">
                {t("quiz_back")}
              </button>
            )}
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mine ? t("rev_update") : t("rev_submit")}
            </button>
          </div>
        </form>
      )}

      {!session?.user && !isPending && (
        <Link
          href="/login"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-sm font-semibold text-white/70 transition hover:border-fuchsia-400/40 hover:text-white"
        >
          <LogIn className="h-4 w-4 text-fuchsia-300" />
          {t("rev_login")}
        </Link>
      )}

      {/* Approved reviews */}
      {data === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-3 text-center text-sm text-white/40">{t("rev_none")}</p>
      ) : (
        <ul className="space-y-2.5">
          {data.items.map((r) => (
            <li key={r._id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/40 to-indigo-500/40 text-xs font-extrabold text-white">
                  {(r.author_name || t("rev_anonymous"))[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-bold text-white">{r.author_name || t("rev_anonymous")}</span>
                {r.vote === "up" ? <ThumbsUp className="h-3.5 w-3.5 text-emerald-300" /> : <ThumbsDown className="h-3.5 w-3.5 text-rose-300" />}
                {r.submitted_at && (
                  <span className="ml-auto text-[11px] text-white/35">{new Date(r.submitted_at).toLocaleDateString(lang)}</span>
                )}
              </div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed text-white/75">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
