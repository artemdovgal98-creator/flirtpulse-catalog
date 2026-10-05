"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check, ChevronRight, Copy, Gift, Loader2, Scale, Send, Users, Wand2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";
import { useCategories } from "@/components/CategoriesProvider";
import { api } from "@/lib/api";
import { enablePush, disablePush, isPushEnabled, isPushSupported } from "@/lib/push-client";
import { cn } from "@/lib/utils";

/** localStorage key read by the notification bell to filter notifications by category. */
export const SUB_CATS_KEY = "flirtpulse_sub_cats";

function readLocalSubs(): string[] {
  try {
    const raw = window.localStorage.getItem(SUB_CATS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeLocalSubs(categories: string[]) {
  try {
    window.localStorage.setItem(SUB_CATS_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event("fp-subs"));
  } catch (err) {
    console.error("[subs] could not persist locally:", err);
  }
}

const sectionTitle = "mb-1 text-[11px] font-extrabold uppercase tracking-widest text-white/40";

// ---------------------------------------------------------------- tools

function ToolsSection() {
  const { t } = useI18n();
  const tools = [
    { href: "/quiz", title: t("tools_quiz"), desc: t("tools_quiz_desc"), Icon: Wand2, grad: "from-fuchsia-500/30 to-violet-600/30" },
    { href: "/compare", title: t("tools_compare"), desc: t("tools_compare_desc"), Icon: Scale, grad: "from-indigo-500/30 to-cyan-500/25" },
  ];
  return (
    <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tools.map(({ href, title, desc, Icon, grad }) => (
        <Link key={href} href={href} className="fp-card fp-rise flex items-center gap-3 rounded-3xl p-4 transition hover:-translate-y-0.5">
          <span className={cn("inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br", grad)}>
            <Icon className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{title}</p>
            <p className="truncate text-xs text-white/40">{desc}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/30" />
        </Link>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- subscriptions + push

function SubscriptionsSection({ pushAllowed }: { pushAllowed: boolean }) {
  const { t, lang } = useI18n();
  const { data: session, isPending } = useSession();
  const { categories, label } = useCategories();
  const [subs, setSubs] = useState<string[]>([]);
  const [push, setPush] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSubs(readLocalSubs());
    setPushSupported(isPushSupported());
    isPushEnabled().then(setPush);
  }, []);

  // Signed-in users: the account is the source of truth (local choices are uploaded once if the account has none).
  useEffect(() => {
    if (isPending || !session?.user) return;
    api.get<{ categories: string[]; guest: boolean }>("/api/subscriptions").then((res) => {
      if (!res.ok || !res.data) {
        console.error("[subs] could not load subscriptions:", res.error);
        return;
      }
      const local = readLocalSubs();
      if (!res.data.categories.length && local.length) {
        api.put("/api/subscriptions", { categories: local }).then((r) => {
          if (!r.ok) console.error("[subs] could not upload local subscriptions:", r.error);
        });
        return;
      }
      setSubs(res.data.categories);
      writeLocalSubs(res.data.categories);
      console.log("[subs] loaded from account:", res.data.categories);
    });
  }, [isPending, session?.user]);

  const persist = useCallback(
    (next: string[]) => {
      writeLocalSubs(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (session?.user) {
          const res = await api.put("/api/subscriptions", { categories: next });
          if (!res.ok) {
            console.error("[subs] save failed:", res.error);
            toast.error(t("eng_error"));
            return;
          }
        }
        if (push) {
          const ok = await enablePush(next, lang);
          if (!ok) console.error("[subs] could not refresh push categories");
        }
        console.log("[subs] saved:", next);
      }, 600);
    },
    [session?.user, push, lang, t]
  );

  function toggle(key: string) {
    const next = subs.includes(key) ? subs.filter((c) => c !== key) : [...subs, key];
    setSubs(next);
    persist(next);
  }

  async function togglePush() {
    if (pushBusy) return;
    setPushBusy(true);
    if (push) {
      await disablePush();
      setPush(false);
      toast.success(t("push_disabled"));
    } else {
      const ok = await enablePush(subs, lang);
      setPush(ok);
      if (ok) toast.success(t("push_enabled"));
      else toast.error(typeof Notification !== "undefined" && Notification.permission === "denied" ? t("push_denied") : t("push_failed"));
    }
    setPushBusy(false);
  }

  return (
    <section className="fp-card fp-rise mt-4 rounded-3xl p-5">
      <h2 className={cn(sectionTitle, "flex items-center gap-1.5")}>
        <Bell className="h-3.5 w-3.5" />
        {t("subs_title")}
      </h2>
      <p className="mb-3 text-sm text-white/55">{t("subs_desc")}</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const active = subs.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggle(c.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition active:scale-95",
                active
                  ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white"
              )}
            >
              {active ? <Check className="h-3.5 w-3.5" /> : <span className="text-sm leading-none">{c.emoji}</span>}
              {label(c.key)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        {t("subs_all_hint")}
        {!session?.user && !isPending ? ` · ${t("subs_local")}` : ""}
      </p>

      {pushAllowed && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/25">
            <BellRing className="h-4 w-4 text-fuchsia-200" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">{t("push_title")}</p>
            <p className="text-[11px] leading-snug text-white/45">{pushSupported ? t("push_desc") : t("push_unsupported")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={push}
            aria-label={t("push_title")}
            onClick={togglePush}
            disabled={!pushSupported || pushBusy}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-40",
              push ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500" : "bg-white/15"
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform",
                push ? "translate-x-6" : "translate-x-1"
              )}
            >
              {pushBusy && <Loader2 className="h-3 w-3 animate-spin text-fuchsia-500" />}
            </span>
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- telegram

function TelegramButton({ url }: { url: string }) {
  const { t } = useI18n();
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="fp-card fp-rise mt-4 flex items-center gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_24px_-8px_rgba(56,189,248,0.9)]">
        <Send className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{t("tg_title")}</p>
        <p className="text-xs text-white/40">{t("tg_desc")}</p>
      </div>
      <span className="hidden rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-200 ring-1 ring-inset ring-sky-400/30 sm:inline">
        {t("tg_btn")}
      </span>
      <ChevronRight className="h-4 w-4 text-white/30 sm:hidden" />
    </a>
  );
}

// ---------------------------------------------------------------- referral

function ReferralSection() {
  const { t } = useI18n();
  const { data: session, isPending } = useSession();
  const [info, setInfo] = useState<{ code: string; link: string; invited: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPending || !session?.user) return;
    api.get<{ code: string; link: string; invited: number }>("/api/referral").then((res) => {
      if (res.ok && res.data) {
        setInfo(res.data);
        console.log(`[referral] code ${res.data.code}, invited ${res.data.invited}`);
      } else console.error("[referral] could not load:", res.error);
    });
  }, [isPending, session?.user]);

  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.link);
      setCopied(true);
      toast.success(t("eng_copied"));
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("[referral] clipboard failed:", err);
      toast.error(t("eng_copy_failed"));
    }
  }

  return (
    <section className="fp-card fp-rise relative mt-4 overflow-hidden rounded-3xl p-5">
      <div className="pointer-events-none absolute -bottom-16 -right-10 h-40 w-40 rounded-full bg-indigo-600/20 blur-3xl" />
      <h2 className={cn(sectionTitle, "flex items-center gap-1.5")}>
        <Gift className="h-3.5 w-3.5" />
        {t("ref_title")}
      </h2>
      <p className="mb-3 text-sm text-white/55">{t("ref_desc")}</p>

      {!session?.user ? (
        isPending ? null : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
          >
            <LogIn className="h-4 w-4" />
            {t("ref_login")}
          </Link>
        )
      ) : !info ? (
        <p className="flex items-center gap-2 text-sm text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("ref_loading")}
        </p>
      ) : (
        <div className="relative space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/75">{info.link}</span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("eng_copied") : t("eng_copy")}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
              <Users className="h-4 w-4 text-fuchsia-200" />
            </span>
            <div>
              <p className="font-display text-xl font-extrabold leading-none text-white">{info.invited}</p>
              <p className="text-[11px] text-white/45">{t("ref_invited")}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- composed

/** Everything ENGAGE adds to the profile page. */
export function EngageSections() {
  const [settings, setSettings] = useState<{ telegram_channel_url: string; push_enabled: string } | null>(null);

  useEffect(() => {
    api.get<{ telegram_channel_url: string; catalog_ad_every: string; push_enabled: string }>("/api/settings/public").then((res) => {
      if (res.ok && res.data) setSettings(res.data);
      else console.error("[profile] public settings unavailable:", res.error);
    });
  }, []);

  return (
    <>
      <ToolsSection />
      <SubscriptionsSection pushAllowed={settings?.push_enabled !== "no"} />
      {settings?.telegram_channel_url && <TelegramButton url={settings.telegram_channel_url} />}
      <ReferralSection />
    </>
  );
}
