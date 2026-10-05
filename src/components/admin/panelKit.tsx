"use client";

/**
 * Shared building blocks for the ADMIN-B panels (networks, ads, ticker,
 * notifications, reviews, translations) — same dark neon glass look as the
 * showcase manager.
 */

import React from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/languages";

export const inputCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60 disabled:opacity-50";
export const monoCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-xs text-emerald-200 outline-none transition placeholder:text-white/25 focus:border-emerald-400/60";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_28px_-12px_rgba(217,70,239,0.95)] transition hover:brightness-110 active:scale-95 disabled:opacity-60";
export const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white/75 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95 disabled:opacity-50";
export const dangerIconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 active:scale-90 disabled:opacity-50";
export const iconBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-fuchsia-400/40 hover:text-white active:scale-90 disabled:opacity-50";

export function PanelHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-indigo-500/25 text-fuchsia-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-extrabold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed text-white/30">{hint}</span>}
    </label>
  );
}

export function SelectBox({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-9 text-sm font-bold text-white outline-none transition focus:border-fuchsia-400/60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#140f24]">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
    </div>
  );
}

/** Interface language picker; `exclude` hides e.g. the source language. */
export function LangSelect({
  value,
  onChange,
  exclude = [],
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  exclude?: string[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <SelectBox
      value={value}
      onChange={onChange}
      className={className}
      ariaLabel={ariaLabel}
      options={LANGUAGES.filter((l) => !exclude.includes(l.code)).map((l) => ({
        value: l.code,
        label: `${l.flag} ${l.label} (${l.code})`,
      }))}
    />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95",
        checked ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/45"
      )}
    >
      <span className={cn("relative h-4 w-7 rounded-full transition", checked ? "bg-emerald-400/70" : "bg-white/15")}>
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
            checked ? "left-[14px]" : "left-0.5"
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function Chip({ tone = "muted", children }: { tone?: "ok" | "warn" | "bad" | "muted" | "info"; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    ok: "bg-emerald-400/10 text-emerald-200",
    warn: "bg-amber-400/10 text-amber-200",
    bad: "bg-rose-500/15 text-rose-200",
    info: "bg-fuchsia-500/15 text-fuchsia-200",
    muted: "bg-white/5 text-white/45",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function Loading() {
  return (
    <div className="fp-card flex h-28 items-center justify-center rounded-3xl">
      <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="fp-card rounded-3xl p-8 text-center text-sm text-white/35">{text}</div>;
}

export function EditorCard({
  title,
  onClose,
  closeLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fp-card fp-rise space-y-4 rounded-3xl p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-sm font-extrabold text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

/** ISO → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO (or "" when empty). */
export function fromLocalInput(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

/** Is a scheduled item live right now? */
export function isLive(item: { is_enabled?: string; starts_at?: string | null; ends_at?: string | null }): boolean {
  if (item.is_enabled === "no") return false;
  const now = Date.now();
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return false;
  if (item.ends_at && new Date(item.ends_at).getTime() < now) return false;
  return true;
}

export function errorText(error: unknown, t: (k: string) => string): string {
  if (error === "Forbidden") return t("a2_session_expired");
  return String(error ?? t("a2_error"));
}

/**
 * JSON-free editor for one translated text: pick a language, edit the text,
 * save (empty text = fall back to the original).
 */
export function TranslationEditor({
  translations,
  onSave,
  t,
  multiline = false,
  label,
}: {
  translations: Record<string, string>;
  onSave: (lang: string, text: string) => Promise<boolean>;
  t: (k: string, vars?: Record<string, string | number>) => string;
  multiline?: boolean;
  label?: string;
}) {
  const [lang, setLang] = React.useState("en");
  const [text, setText] = React.useState(translations.en ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setText(translations[lang] ?? "");
  }, [lang, translations]);

  const count = Object.keys(translations).length;

  async function submit() {
    setSaving(true);
    await onSave(lang, text);
    setSaving(false);
  }

  return (
    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/35">
        {label ?? t("a2_translations")} · {t("a2_translations_count", { n: count, total: LANGUAGES.length })}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <LangSelect value={lang} onChange={setLang} className="sm:w-56" ariaLabel={t("a2_language")} />
        {multiline ? (
          <textarea value={text} rows={2} onChange={(e) => setText(e.target.value)} className={inputCls + " resize-y"} placeholder={t("a2_translation_empty")} />
        ) : (
          <input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder={t("a2_translation_empty")} />
        )}
      </div>
      <button type="button" onClick={submit} disabled={saving || text === (translations[lang] ?? "")} className={ghostBtn}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {t("a2_translation_save", { lang: lang.toUpperCase() })}
      </button>
    </div>
  );
}
