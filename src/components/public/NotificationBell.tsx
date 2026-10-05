"use client";

/**
 * Header bell: notifications in the visitor's language. Read state is kept on
 * this device (localStorage, by notification id). Subscribed categories come
 * from `flirtpulse_sub_cats` (written by the subscriptions UI).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Megaphone, Sparkles, Flame, BellOff } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface NotificationItem {
  _id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  link: string;
  published_at: string;
}

const READ_KEY = "flirtpulse_notif_read";
const SUB_KEY = "flirtpulse_sub_cats";
const ICON: Record<string, typeof Megaphone> = { news: Megaphone, novelty: Sparkles, new_showcase: Flame };

function readSet(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(READ_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function subscribedCats(): string[] {
  try {
    const raw = window.localStorage.getItem(SUB_KEY) || "";
    if (!raw) return [];
    if (raw.trim().startsWith("[")) return (JSON.parse(raw) as string[]).filter(Boolean);
    return raw.split(",").map((c) => c.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function timeAgo(iso: string, lang: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function NotificationBell() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [read, setRead] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    const cats = subscribedCats();
    const qs = `lang=${lang}${cats.length ? `&cats=${encodeURIComponent(cats.join(","))}` : ""}`;
    api.get<{ items: NotificationItem[] }>(`/api/notifications?${qs}`).then((res) => {
      if (res.ok && res.data) {
        setItems(res.data.items);
        console.log(`[bell] ${res.data.items.length} notifications`);
      } else {
        console.error("[bell] could not load notifications:", res.error);
      }
    });
  }, [lang]);

  useEffect(() => {
    setRead(readSet());
    load();
    const id = window.setInterval(load, 5 * 60_000);
    return () => window.clearInterval(id);
  }, [load]);
  useRefreshOnFocus(load, 60_000);

  const unread = useMemo(() => items.filter((i) => !read.includes(i._id)).length, [items, read]);

  const persist = (next: string[]) => {
    // Keep only ids that still exist so the list does not grow forever.
    const keep = next.filter((id) => items.some((i) => i._id === id)).slice(-200);
    setRead(keep);
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify(keep));
    } catch (err) {
      console.error("[bell] could not persist read state:", err);
    }
  };

  const markAll = () => {
    persist(items.map((i) => i._id));
    console.log("[bell] marked all as read");
  };
  const markOne = (id: string) => {
    if (!read.includes(id)) persist([...read, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("pub_notif_title")}
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:border-fuchsia-400/50 hover:text-fuchsia-200"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-rose-500 px-1 text-[10px] font-bold text-white shadow-[0_0_12px_-2px_rgba(244,63,94,0.9)]">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="fp-glass w-[min(92vw,380px)] overflow-hidden rounded-3xl border-white/10 p-0"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-display text-sm font-bold text-white">{t("pub_notif_title")}</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-fuchsia-300 hover:text-fuchsia-200"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("pub_notif_read_all")}
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <BellOff className="h-7 w-7 text-white/25" />
              <p className="text-xs text-white/45">{t("pub_notif_empty")}</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICON[n.type] ?? Megaphone;
              const isUnread = !read.includes(n._id);
              const inner = (
                <div className={cn("flex gap-3 px-4 py-3 transition hover:bg-white/[0.04]", isUnread && "bg-fuchsia-500/[0.06]")}>
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 text-fuchsia-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="flex-1 text-[13px] font-bold leading-snug text-white">{n.title}</span>
                      {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" />}
                    </span>
                    {n.body && <span className="mt-0.5 line-clamp-3 block text-xs leading-relaxed text-white/55">{n.body}</span>}
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      {timeAgo(n.published_at, lang)}
                    </span>
                  </span>
                </div>
              );
              const onClick = () => {
                markOne(n._id);
                if (n.link) setOpen(false);
              };
              if (!n.link)
                return (
                  <button key={n._id} type="button" onClick={onClick} className="block w-full text-left">
                    {inner}
                  </button>
                );
              return /^https?:\/\//i.test(n.link) ? (
                <a key={n._id} href={n.link} target="_blank" rel="noopener noreferrer" onClick={onClick} className="block">
                  {inner}
                </a>
              ) : (
                <Link key={n._id} href={n.link} onClick={onClick} className="block">
                  {inner}
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
