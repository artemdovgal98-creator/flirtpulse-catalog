"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutGrid, Sparkles, User, Globe, Check } from "lucide-react";
import { NotificationBell } from "@/components/public/NotificationBell";
import { SearchBox } from "@/components/public/SearchBox";
import { Ticker } from "@/components/public/Ticker";
import { AgeGate } from "@/components/public/AgeGate";
import { PwaRegister } from "@/components/public/PwaRegister";
import { BottomBanner } from "@/components/public/BottomBanner";
import { CompareBar } from "@/components/engage/CompareBar";
import { RefCapture } from "@/components/engage/RefCapture";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { useFavorites } from "@/components/FavoritesProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalog", key: "nav_catalog", Icon: LayoutGrid },
  { href: "/ai-chat", key: "nav_ai", Icon: Sparkles },
  { href: "/favorites", key: "nav_favorites", Icon: Heart },
  { href: "/profile", key: "nav_profile", Icon: User },
];

/** The animated FlirtPulse wordmark with its glowing heart. */
export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_22px_-4px_rgba(217,70,239,0.9)]">
        <Heart className="fp-heart h-[18px] w-[18px] fill-white text-white" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="font-display text-[19px] font-extrabold tracking-tight">
          <span className="fp-sheen">Flirt</span>
          <span className="text-white">Pulse</span>
        </span>
      )}
    </span>
  );
}

function LanguagePicker() {
  const { lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change language"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="uppercase">{current.code}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="fp-glass max-h-[70vh] w-52 overflow-y-auto border-white/10">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className="cursor-pointer gap-2 text-sm"
          >
            <span className="text-base leading-none">{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {l.code === lang && <Check className="h-3.5 w-3.5 text-fuchsia-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopHeader() {
  const { t } = useI18n();
  const { ids } = useFavorites();

  return (
    <header className="fp-glass sticky top-0 z-40 border-b border-white/10">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link href="/" aria-label="FlirtPulse" className="shrink-0 transition hover:opacity-90">
          <span className="sm:hidden">
            <BrandLogo compact />
          </span>
          <span className="hidden sm:inline">
            <BrandLogo />
          </span>
        </Link>

        <div className="ml-auto flex min-w-0 flex-1 justify-end">
          <SearchBox />
        </div>

        <NotificationBell />

        <Link
          href="/favorites"
          aria-label={t("nav_favorites")}
          className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:border-rose-400/50 hover:text-rose-300 sm:inline-flex"
        >
          <Heart className="h-4 w-4" />
          {ids.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 px-1 text-[10px] font-bold text-white">
              {ids.length > 99 ? "99+" : ids.length}
            </span>
          )}
        </Link>

        <LanguagePicker />
      </div>
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { ids } = useFavorites();

  return (
    <nav className="fp-glass fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map(({ href, key, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                active ? "text-white" : "text-white/45 hover:text-white/75"
              )}
            >
              <span
                className={cn(
                  "relative inline-flex h-9 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                  active
                    ? "bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 shadow-[0_0_20px_-6px_rgba(217,70,239,0.9)]"
                    : "bg-transparent"
                )}
              >
                <Icon
                  className={cn("h-[19px] w-[19px] transition", active && "scale-110")}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active && href === "/favorites" ? "currentColor" : "none"}
                />
                {href === "/favorites" && ids.length > 0 && (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 px-1 text-[9px] font-bold text-white">
                    {ids.length > 99 ? "99+" : ids.length}
                  </span>
                )}
              </span>
              <span className="truncate px-1">{t(key)}</span>
              {active && (
                <span className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Chrome-free routes: the auth screens are full-bleed. */
const BARE_ROUTES = ["/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = BARE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (bare) {
    return <main className="relative z-10 min-h-screen">{children}</main>;
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <PwaRegister />
      <RefCapture />
      <TopHeader />
      <Ticker />
      <main className="flex-1 pb-40">{children}</main>
      <CompareBar />
      <BottomBanner />
      <BottomNav />
      <AgeGate />
    </div>
  );
}
