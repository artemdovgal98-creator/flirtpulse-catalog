"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCompare, COMPARE_MAX } from "@/components/CompareProvider";

/** Floating glass bar above the bottom navigation while showcases are picked for comparison. */
export function CompareBar() {
  const { t } = useI18n();
  const { ids, clear } = useCompare();
  const pathname = usePathname();

  if (ids.length < 1 || pathname === "/compare") return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
      <div className="fp-rise pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-fuchsia-400/30 bg-[#1b1330]/85 p-1.5 pl-3 shadow-[0_18px_50px_-18px_rgba(217,70,239,0.9)] backdrop-blur-xl">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30">
          <Scale className="h-4 w-4 text-fuchsia-200" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-white">{t("cmp_bar_count", { n: ids.length, max: COMPARE_MAX })}</p>
          {ids.length < 2 && <p className="truncate text-[11px] text-white/45">{t("cmp_add_more")}</p>}
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label={t("cmp_clear")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <Link
          href="/compare"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95"
        >
          {t("cmp_btn")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
