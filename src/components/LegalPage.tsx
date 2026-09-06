"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LegalPage({
  titleKey,
  sections,
}: {
  titleKey: string;
  sections: Array<{ heading: string; body: string }>;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-white/45 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common_back")}
      </Link>

      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{t(titleKey)}</h1>

      <div className="fp-card mt-5 space-y-6 rounded-3xl p-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display mb-2 text-base font-bold text-fuchsia-200">
              {section.heading}
            </h2>
            <p className="text-sm leading-relaxed text-white/60">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-[11px] leading-relaxed text-white/40">
        {t("prof_age_warning")}
      </p>
    </div>
  );
}
