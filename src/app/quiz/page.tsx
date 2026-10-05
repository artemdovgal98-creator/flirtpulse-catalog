"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wand2, ArrowLeft, ArrowRight, Loader2, RotateCcw, Search, MessageCircle, Video, Mic, Image as ImageIcon,
  Shuffle, Gift, Sparkles, Gem, Check, MapPin,
} from "lucide-react";
import { useI18n, LANGUAGES } from "@/lib/i18n";
import { useCategories } from "@/components/CategoriesProvider";
import { api } from "@/lib/api";
import { OfferCard } from "@/components/OfferCard";
import { GEO_CODES, GEO_FLAGS, GEO_NAMES, type Offer } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface QuizResult {
  offer: Offer;
  match: number;
  reasons: string[];
}

interface Answers {
  goal: string;
  language: string;
  country: string;
  format: string;
  access: string;
}

const STEPS = ["goal", "language", "country", "format", "access"] as const;
type Step = (typeof STEPS)[number];

function regionName(code: string, lang: string): string {
  try {
    const dn = new Intl.DisplayNames([lang], { type: "region" });
    return dn.of(code.toUpperCase()) || GEO_NAMES[code] || code;
  } catch {
    return GEO_NAMES[code] || code;
  }
}

function OptionButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition active:scale-[0.98]",
        active
          ? "border-fuchsia-400/70 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white shadow-[0_0_30px_-12px_rgba(217,70,239,0.9)]"
          : "border-white/10 bg-white/[0.035] text-white/70 hover:border-white/25 hover:text-white",
        className
      )}
    >
      {children}
      {active && <Check className="ml-auto h-4 w-4 shrink-0 text-fuchsia-300" />}
    </button>
  );
}

export default function QuizPage() {
  const { t, lang } = useI18n();
  const { categories, geo, label } = useCategories();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", language: "", country: "", format: "", access: "" });
  const [countryTouched, setCountryTouched] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [error, setError] = useState("");

  // Prefill the country with the detected GEO and the language with the UI language.
  useEffect(() => {
    if (!countryTouched && geo) setAnswers((a) => ({ ...a, country: geo }));
  }, [geo, countryTouched]);
  useEffect(() => {
    setAnswers((a) => (a.language ? a : { ...a, language: lang }));
  }, [lang]);

  const current: Step = STEPS[step];
  const total = STEPS.length;

  const countries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GEO_CODES.filter((c) => c !== "worldwide")
      .map((c) => ({ code: c, name: regionName(c, lang) }))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.code.includes(q) || (GEO_NAMES[c.code] || "").toLowerCase().includes(q))
      .sort((a, b) => (a.code === geo ? -1 : b.code === geo ? 1 : a.name.localeCompare(b.name)));
  }, [search, lang, geo]);

  async function submit(final: Answers) {
    setLoading(true);
    setError("");
    console.log("[quiz] submitting answers:", final);
    const res = await api.post<{ results: QuizResult[] }>("/api/quiz", {
      goal: final.goal || "any",
      language: final.language || "any",
      country: final.country,
      format: final.format || "any",
      access: final.access || "any",
      lang,
    });
    if (res.ok && res.data) {
      setResults(res.data.results);
      console.log(`[quiz] received ${res.data.results.length} matches`);
    } else {
      console.error("[quiz] request failed:", res.error);
      setError(t("eng_error"));
    }
    setLoading(false);
  }

  function choose(key: keyof Answers, value: string) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (key === "country") setCountryTouched(true);
    if (step < total - 1) setTimeout(() => setStep((s) => Math.min(s + 1, total - 1)), 160);
    else submit(next);
  }

  function restart() {
    setResults(null);
    setStep(0);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const titles: Record<Step, string> = {
    goal: t("quiz_q_goal"),
    language: t("quiz_q_language"),
    country: t("quiz_q_country"),
    format: t("quiz_q_format"),
    access: t("quiz_q_access"),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">
      <header className="relative mb-6 overflow-hidden">
        <div className="pointer-events-none absolute -left-10 -top-16 h-44 w-44 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 shadow-[0_0_28px_-6px_rgba(217,70,239,0.95)]">
            <Wand2 className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{t("quiz_title")}</h1>
            <p className="text-sm text-white/50">{t("quiz_subtitle")}</p>
          </div>
        </div>
      </header>

      {results ? (
        <section className="fp-rise">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-white">{t("quiz_result_title")}</h2>
              <p className="text-xs text-white/45">{t("quiz_result_sub")}</p>
            </div>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              {t("quiz_restart")}
            </button>
          </div>

          {results.length === 0 ? (
            <div className="fp-card rounded-3xl px-6 py-14 text-center text-sm text-white/55">{t("quiz_empty")}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r, i) => (
                <div key={r.offer._id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-extrabold",
                        i === 0
                          ? "bg-gradient-to-br from-amber-300 to-orange-500 text-black"
                          : "bg-white/10 text-white"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-1 text-xs font-extrabold text-fuchsia-200 ring-1 ring-inset ring-fuchsia-400/30">
                      {t("quiz_match", { n: r.match })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-inset ring-emerald-400/25"
                      >
                        <Check className="h-3 w-3" />
                        {t(`quiz_reason_${reason}`)}
                      </span>
                    ))}
                  </div>
                  <OfferCard offer={r.offer} index={i} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="fp-card fp-rise relative mx-auto max-w-2xl overflow-hidden rounded-3xl p-5 sm:p-7">
          {/* Progress */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              <span>{t("quiz_step", { n: step + 1, total })}</span>
              <span>{Math.round(((step + (loading ? 1 : 0)) / total) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${((step + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          <h2 key={current} className="fp-rise mb-4 font-display text-xl font-extrabold text-white">
            {titles[current]}
          </h2>

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-14 text-sm text-white/60">
              <Loader2 className="h-7 w-7 animate-spin text-fuchsia-300" />
              {t("quiz_loading")}
            </div>
          ) : (
            <div key={`opts-${current}`} className="fp-rise">
              {current === "goal" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {categories.map((c) => (
                    <OptionButton key={c.key} active={answers.goal === c.key} onClick={() => choose("goal", c.key)}>
                      <span className="text-xl leading-none">{c.emoji}</span>
                      <span className="min-w-0 truncate">{label(c.key)}</span>
                    </OptionButton>
                  ))}
                  <OptionButton active={answers.goal === "any"} onClick={() => choose("goal", "any")}>
                    <Shuffle className="h-5 w-5 text-white/50" />
                    {t("eng_any")}
                  </OptionButton>
                </div>
              )}

              {current === "language" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LANGUAGES.map((l) => (
                    <OptionButton key={l.code} active={answers.language === l.code} onClick={() => choose("language", l.code)} className="px-3">
                      <span className="text-base leading-none">{l.flag}</span>
                      <span className="min-w-0 truncate">{l.label}</span>
                    </OptionButton>
                  ))}
                  <OptionButton active={answers.language === "any"} onClick={() => choose("language", "any")} className="px-3">
                    <Shuffle className="h-4 w-4 text-white/50" />
                    <span className="truncate">{t("eng_any")}</span>
                  </OptionButton>
                </div>
              )}

              {current === "country" && (
                <div>
                  {answers.country && (
                    <button
                      type="button"
                      onClick={() => choose("country", answers.country)}
                      className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 px-4 py-3.5 text-left text-sm font-bold text-white transition active:scale-[0.98]"
                    >
                      <span className="text-xl leading-none">{GEO_FLAGS[answers.country] ?? "🏳️"}</span>
                      <span className="min-w-0 flex-1 truncate">{regionName(answers.country, lang)}</span>
                      {!countryTouched && answers.country === geo && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-fuchsia-200/80">
                          <MapPin className="h-3 w-3" />
                          {t("quiz_country_detected")}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 shrink-0 text-fuchsia-200" />
                    </button>
                  )}
                  <label className="mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3">
                    <Search className="h-4 w-4 text-white/35" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("quiz_country_search")}
                      aria-label={t("quiz_country_search")}
                      className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
                    />
                  </label>
                  <div className="fp-rail grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                    <OptionButton active={answers.country === "" && countryTouched} onClick={() => choose("country", "")} className="py-2.5">
                      <span className="text-base leading-none">🌍</span>
                      <span className="truncate">{t("eng_any")}</span>
                    </OptionButton>
                    {countries.map((c) => (
                      <OptionButton key={c.code} active={answers.country === c.code} onClick={() => choose("country", c.code)} className="py-2.5">
                        <span className="text-base leading-none">{GEO_FLAGS[c.code] ?? "🏳️"}</span>
                        <span className="min-w-0 truncate">{c.name}</span>
                      </OptionButton>
                    ))}
                    {countries.length === 0 && (
                      <p className="px-2 py-4 text-sm text-white/40">{t("quiz_country_none")}</p>
                    )}
                  </div>
                </div>
              )}

              {current === "format" && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: "chat", Icon: MessageCircle },
                    { v: "video", Icon: Video },
                    { v: "voice", Icon: Mic },
                    { v: "images", Icon: ImageIcon },
                  ].map(({ v, Icon }) => (
                    <OptionButton key={v} active={answers.format === v} onClick={() => choose("format", v)} className="flex-col items-start gap-2 py-4">
                      <Icon className="h-6 w-6 text-fuchsia-300" />
                      {t(`quiz_fmt_${v}`)}
                    </OptionButton>
                  ))}
                  <OptionButton active={answers.format === "any"} onClick={() => choose("format", "any")} className="col-span-2">
                    <Shuffle className="h-5 w-5 text-white/50" />
                    {t("eng_any")}
                  </OptionButton>
                </div>
              )}

              {current === "access" && (
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { v: "free", Icon: Gift },
                    { v: "freemium", Icon: Sparkles },
                    { v: "paid", Icon: Gem },
                  ].map(({ v, Icon }) => (
                    <OptionButton key={v} active={answers.access === v} onClick={() => choose("access", v)}>
                      <Icon className="h-5 w-5 text-fuchsia-300" />
                      {t(`quiz_acc_${v}`)}
                    </OptionButton>
                  ))}
                  <OptionButton active={answers.access === "any"} onClick={() => choose("access", "any")}>
                    <Shuffle className="h-5 w-5 text-white/50" />
                    {t("eng_any")}
                  </OptionButton>
                </div>
              )}

              {error && <p className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/65 transition hover:text-white disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("quiz_back")}
                </button>
                {step < total - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:border-fuchsia-400/40 hover:text-white"
                  >
                    {t("quiz_next")}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => submit(answers)}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_36px_-18px_rgba(217,70,239,1)] transition hover:brightness-110 active:scale-95"
                  >
                    <Wand2 className="h-4 w-4" />
                    {t("quiz_show")}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {!results && (
        <p className="mt-6 text-center text-xs text-white/35">
          <Link href="/catalog" className="underline-offset-4 hover:text-white/70 hover:underline">
            {t("cmp_open_catalog")}
          </Link>
        </p>
      )}
    </div>
  );
}
