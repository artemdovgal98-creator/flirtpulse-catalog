"use client";

import Link from "next/link";
import { Wand2, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Call-to-action for the "Find your service" quiz. `compact` = pill button. */
export function QuizCta({ compact }: { compact?: boolean }) {
  const { t } = useI18n();

  if (compact) {
    return (
      <Link
        href="/quiz"
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-[0_12px_30px_-14px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95"
      >
        <Wand2 className="h-4 w-4" />
        {t("quiz_cta_compact")}
      </Link>
    );
  }

  return (
    <Link
      href="/quiz"
      className="fp-card fp-rise group relative flex items-center gap-4 overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-fuchsia-600/25 blur-3xl transition group-hover:bg-fuchsia-500/35" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-indigo-600/20 blur-3xl" />
      <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_26px_-6px_rgba(217,70,239,0.95)]">
        <Wand2 className="h-5 w-5 text-white" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="font-display text-base font-extrabold text-white">{t("quiz_cta_title")}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">{t("quiz_cta_desc")}</p>
      </div>
      <span className="relative hidden shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-bold text-white sm:inline-flex">
        {t("quiz_cta_btn")}
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </span>
      <ArrowRight className="relative h-5 w-5 shrink-0 text-fuchsia-300 sm:hidden" />
    </Link>
  );
}
