"use client";

import React from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared look of the admin panels (dark neon glass). Owned by ADMIN-A. */

export const inputCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60";

export const smallInputCls =
  "rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60";

export function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
      {icon}
      {children}
    </span>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1.5 block text-[11px] leading-relaxed text-white/30">{children}</span>;
}

export function PanelTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-display text-lg font-extrabold text-white">{title}</h2>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("fp-card rounded-3xl p-4 sm:p-5", className)}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("fp-card flex h-28 items-center justify-center rounded-3xl", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="fp-card rounded-3xl p-8 text-center text-sm text-white/35">{children}</div>;
}

type BtnVariant = "primary" | "ghost" | "danger" | "success" | "warning";

const BTN: Record<BtnVariant, string> = {
  primary:
    "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-[0_10px_28px_-12px_rgba(217,70,239,0.95)] hover:brightness-110",
  ghost: "border border-white/15 bg-white/5 text-white/70 hover:text-white hover:border-fuchsia-400/40",
  danger: "border border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20",
  success: "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20",
  warning: "border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20",
};

export function Btn({
  variant = "ghost",
  loading,
  icon,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "inline-flex touch-manipulation items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-50",
        BTN[variant],
        className
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition active:scale-95",
        active
          ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
          : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-9 text-xs font-bold text-white outline-none transition focus:border-fuchsia-400/60 [&>option]:bg-[#140f24]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-fuchsia-400/30"
    >
      <span className="min-w-0 flex-1 text-sm font-bold text-white/80">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** Status pill colours for showcases. */
export const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-400/15 text-slate-200 ring-slate-300/20",
  review: "bg-amber-400/15 text-amber-200 ring-amber-300/25",
  active: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/25",
  paused: "bg-white/10 text-white/50 ring-white/10",
  archived: "bg-rose-500/15 text-rose-200 ring-rose-300/20",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset",
        STATUS_STYLE[status] ?? STATUS_STYLE.paused
      )}
    >
      {label}
    </span>
  );
}

export function fmtNumber(n: number, digits = 0): string {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtMoney(n: number, currency = "USD"): string {
  try {
    return (Number(n) || 0).toLocaleString(undefined, { style: "currency", currency, maximumFractionDigits: 2 });
  } catch {
    return `${fmtNumber(n, 2)} ${currency}`;
  }
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
