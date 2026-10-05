"use client";

import React, { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ImagePlus, Link2, Loader2, Save, ShieldCheck, Star, X, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ACCESS_MODELS, AI_SUBFILTERS, COLOR_DOT, GEO_CODES, GEO_FLAGS, GEO_NAMES, PAYOUT_MODELS,
  type AdminOffer,
} from "@/lib/catalog";
import { LANGUAGES } from "@/lib/languages";
import { Btn, Chip, Hint, Label, Select, StatusPill, inputCls } from "@/components/admin/adminKit";

const MAX_IMAGES = 3;
const MAX_BYTES = 10 * 1024 * 1024;

export const FORM_STATUSES = ["draft", "review", "active", "paused", "archived"] as const;

export interface AdminCategory {
  _id: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
  subfilters: string;
  is_enabled: string;
  geo_only: string;
  sort_order: number;
  offers: number;
  translations: Record<string, string>;
}

export interface AdminNetwork {
  _id: string;
  name: string;
  slug?: string;
}

export interface CheckItem {
  key: string;
  ok: boolean;
  level: "error" | "warning";
  message: string;
  details?: Record<string, any>;
}

export interface CheckResult {
  ok: boolean;
  checks: CheckItem[];
  checked_at: string;
}

export interface ShowcaseFormState {
  _id?: string;
  name: string;
  short_name: string;
  description: string;
  category: string[];
  geo: string[];
  tags: string;
  offer_url: string;
  subid_template: string;
  affiliate_network: string;
  payout_model: string;
  access_model: string;
  subfilters: string[];
  languages: string[];
  status: string;
  is_featured: string;
  images: Array<{ name: string; url: string }>;
  check_result: CheckResult | null;
}

export const EMPTY_FORM: ShowcaseFormState = {
  name: "",
  short_name: "",
  description: "",
  category: [],
  geo: ["worldwide"],
  tags: "",
  offer_url: "",
  subid_template: "",
  affiliate_network: "",
  payout_model: "",
  access_model: "",
  subfilters: [],
  languages: [],
  status: "draft",
  is_featured: "no",
  images: [],
  check_result: null,
};

function parseCheck(value: unknown): CheckResult | null {
  if (!value) return null;
  if (typeof value === "object") return value as CheckResult;
  try {
    return JSON.parse(String(value)) as CheckResult;
  } catch {
    return null;
  }
}

export function formFromOffer(item: AdminOffer): ShowcaseFormState {
  const net = item.affiliate_network;
  return {
    _id: item._id,
    name: item.name ?? "",
    short_name: item.short_name ?? "",
    description: item.description ?? "",
    category: item.category ?? [],
    geo: item.geo ?? [],
    tags: item.tags ?? "",
    offer_url: item.offer_url ?? "",
    subid_template: item.subid_template ?? "",
    affiliate_network: typeof net === "string" ? net : net?._id ?? "",
    payout_model: item.payout_model ?? "",
    access_model: item.access_model ?? "",
    subfilters: item.subfilters ?? [],
    languages: item.languages ?? [],
    status: item.status ?? "draft",
    is_featured: item.is_featured ?? "no",
    images: (item.images ?? []).filter((f) => f?.name).map((f) => ({ name: f.name, url: f.url })),
    check_result: parseCheck(item.check_result),
  };
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Renders a list of pre-publish check results. */
export function CheckList({ result }: { result: CheckResult | null }) {
  const { t } = useI18n();
  if (!result) return null;
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-2xl border p-3",
        result.ok ? "border-emerald-400/25 bg-emerald-400/[0.05]" : "border-rose-400/30 bg-rose-500/[0.06]"
      )}
    >
      <p className={cn("flex items-center gap-1.5 text-xs font-extrabold", result.ok ? "text-emerald-200" : "text-rose-200")}>
        {result.ok ? <ShieldCheck className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {result.ok ? t("ap_checks_ok") : t("ap_checks_failed")}
        <span className="ml-auto text-[10px] font-bold text-white/30">
          {result.checked_at ? new Date(result.checked_at).toLocaleString() : ""}
        </span>
      </p>
      {result.checks.map((c) => {
        const warn = !c.ok && c.level === "warning";
        const softWarn = c.ok && c.level === "warning";
        return (
          <div key={c.key} className="flex items-start gap-2 text-[12px]">
            {c.ok && !softWarn ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
            ) : warn || softWarn ? (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
            )}
            <span className="min-w-0">
              <b className="text-white/85">{t(`ap_check_${c.key}`)}</b>
              <span className="text-white/45"> — {c.message}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Create / edit form of a showcase: copy, categories (dynamic), GEO, network,
 * hidden tracking link with "Check link", SubID template, up to 3 images,
 * TOP flag, AI sub-filters, languages, access model and workflow status.
 */
export function ShowcaseForm({
  initial,
  categories,
  networks,
  canManage,
  onClose,
  onSaved,
}: {
  initial: ShowcaseFormState;
  categories: AdminCategory[];
  networks: AdminNetwork[];
  canManage: boolean;
  onClose: () => void;
  onSaved: (item: AdminOffer, blocked: boolean) => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<ShowcaseFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [linkCheck, setLinkCheck] = useState<CheckResult | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const set = <K extends keyof ShowcaseFormState>(key: K, value: ShowcaseFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const selectedCats = categories.filter((c) => form.category.includes(c.key));
  const subfilterOptions = Array.from(
    new Set(
      selectedCats.flatMap((c) =>
        String(c.subfilters || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      )
    )
  ).filter((s) => (AI_SUBFILTERS as readonly string[]).includes(s));
  const showSubfilters = subfilterOptions.length > 0 || form.subfilters.length > 0;
  // Legacy category values on a card that have no catalog_category row are still shown.
  const legacyCats = form.category.filter((k) => !categories.some((c) => c.key === k));

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;
    const room = MAX_IMAGES - form.images.length;
    if (room <= 0) {
      toast.error(t("admin_images_hint"));
      return;
    }
    const files = picked.slice(0, room);
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      toast.error(`${tooBig.name}: ${(tooBig.size / 1048576).toFixed(1)} MB > 10 MB`);
      return;
    }
    setUploading(true);
    const payload = new FormData();
    files.forEach((f) => payload.append("files", f));
    const res = await api.upload<{ files: Array<{ name: string; url: string }> }>("/api/admin/upload", payload);
    setUploading(false);
    if (!res.ok || !res.data) {
      console.error("[showcase-form] upload failed:", res.error);
      toast.error(String(res.error ?? t("admin_upload_failed")));
      return;
    }
    const uploaded = res.data.files.filter((f) => f?.name);
    setForm((prev) => {
      const fresh = uploaded.filter((f) => !prev.images.some((img) => img.name === f.name));
      return { ...prev, images: [...prev.images, ...fresh].slice(0, MAX_IMAGES) };
    });
    toast.success(t("admin_uploaded"));
    console.log(`[showcase-form] uploaded ${uploaded.length} image(s)`);
  }

  async function checkLink() {
    if (!form.offer_url.trim()) {
      toast.error(t("ap_link_empty"));
      return;
    }
    setCheckingLink(true);
    const res = await api.post<CheckResult & { url: string }>("/api/admin/showcases/check-link", {
      url: form.offer_url,
      id: form._id,
    });
    setCheckingLink(false);
    if (!res.ok || !res.data) {
      console.error("[showcase-form] link check failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setLinkCheck(res.data);
    console.log("[showcase-form] link check:", res.data.ok, res.data.checks.map((c) => `${c.key}=${c.ok}`).join(" "));
  }

  async function runFullCheck() {
    if (!form._id) return;
    setCheckingAll(true);
    const res = await api.post<{ check: CheckResult }>(`/api/admin/showcases/${form._id}/check`, {});
    setCheckingAll(false);
    if (!res.ok || !res.data) {
      toast.error(String(res.error ?? "Error"));
      return;
    }
    set("check_result", res.data.check);
    toast[res.data.check.ok ? "success" : "warning"](res.data.check.ok ? t("ap_checks_ok") : t("ap_checks_failed"));
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error(t("admin_required"));
      return;
    }
    setSaving(true);
    const body = {
      name: form.name,
      short_name: form.short_name,
      description: form.description,
      category: form.category,
      geo: form.geo,
      tags: form.tags,
      offer_url: form.offer_url,
      subid_template: form.subid_template,
      affiliate_network: form.affiliate_network,
      payout_model: form.payout_model,
      access_model: form.access_model,
      subfilters: form.subfilters,
      languages: form.languages,
      status: form.status,
      is_featured: form.is_featured,
      images: form.images.map((f) => ({ name: f.name })),
    };
    type SaveRes = { item: AdminOffer; check: CheckResult | null; blocked: boolean };
    const res = form._id
      ? await api.put<SaveRes>(`/api/admin/showcases/${form._id}`, body)
      : await api.post<SaveRes>("/api/admin/showcases", body);
    setSaving(false);

    if (!res.ok || !res.data) {
      console.error("[showcase-form] save failed:", res.error);
      toast.error(
        res.error === "Forbidden"
          ? t("admin_session_expired")
          : res.error === "ADMIN_ROLE_REQUIRED"
            ? t("ap_admin_role_required")
            : String(res.error ?? "Error")
      );
      return;
    }
    const { item, check, blocked } = res.data;
    console.log(`[showcase-form] saved "${item.name}" status=${item.status} blocked=${blocked}`);
    if (blocked) {
      toast.warning(t("ap_publish_blocked"));
      setForm((prev) => ({ ...prev, _id: item._id, status: item.status ?? prev.status, check_result: check }));
      onSaved(item, true);
      return;
    }
    toast.success(form._id ? t("admin_updated") : t("admin_created"));
    onSaved(item, false);
  }

  return (
    <div className="fp-card fp-rise space-y-4 rounded-3xl p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-sm font-extrabold text-white">{form._id ? t("admin_edit") : t("admin_add")}</h3>
        {form._id && <StatusPill status={initial.status} label={t(`ap_status_${initial.status}`)} />}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
          aria-label={t("admin_cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block">
          <Label>{t("admin_field_title")}</Label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="FlirtPulse Premium" />
        </label>
        <label className="block">
          <Label>{t("ap_short_name")}</Label>
          <input value={form.short_name} onChange={(e) => set("short_name", e.target.value)} className={inputCls} maxLength={60} />
        </label>
      </div>

      <label className="block">
        <Label>{t("admin_field_desc")}</Label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className={cn(inputCls, "resize-y")}
        />
        <Hint>{t("ap_desc_hint")}</Hint>
      </label>

      <div>
        <Label>{t("admin_field_category")}</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip
              key={c.key}
              active={form.category.includes(c.key)}
              onClick={() => set("category", toggle(form.category, c.key))}
              className={cn(c.is_enabled === "no" && "opacity-60")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", COLOR_DOT[c.color] ?? "bg-fuchsia-400")} />
              {c.emoji} {c.label}
            </Chip>
          ))}
          {legacyCats.map((k) => (
            <Chip key={k} active onClick={() => set("category", toggle(form.category, k))}>
              {k}
            </Chip>
          ))}
        </div>
      </div>

      {showSubfilters && (
        <div>
          <Label>{t("ap_subfilters")}</Label>
          <div className="flex flex-wrap gap-2">
            {(subfilterOptions.length ? subfilterOptions : [...AI_SUBFILTERS]).map((s) => (
              <Chip key={s} active={form.subfilters.includes(s)} onClick={() => set("subfilters", toggle(form.subfilters, s))}>
                {t(`ap_sub_${s}`)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>{t("admin_field_countries")}</Label>
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-2.5">
          {GEO_CODES.map((g) => {
            const active = form.geo.includes(g);
            return (
              <button
                key={g}
                type="button"
                title={GEO_NAMES[g]}
                onClick={() => set("geo", toggle(form.geo, g))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase transition",
                  active ? "bg-fuchsia-500/25 text-white ring-1 ring-inset ring-fuchsia-400/50" : "bg-white/5 text-white/45 hover:text-white"
                )}
              >
                <span className="text-[12px] leading-none">{GEO_FLAGS[g] ?? "🏳️"}</span>
                {g === "worldwide" ? "WW" : g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>{t("ap_network")}</Label>
          <Select value={form.affiliate_network} onChange={(v) => set("affiliate_network", v)} ariaLabel={t("ap_network")}>
            <option value="">{t("ap_direct")}</option>
            {networks.map((n) => (
              <option key={n._id} value={n._id}>
                {n.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("ap_payout_model")}</Label>
          <Select value={form.payout_model} onChange={(v) => set("payout_model", v)} ariaLabel={t("ap_payout_model")}>
            <option value="">—</option>
            {PAYOUT_MODELS.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t("ap_access_model")}</Label>
          <Select value={form.access_model} onChange={(v) => set("access_model", v)} ariaLabel={t("ap_access_model")}>
            <option value="">—</option>
            {ACCESS_MODELS.map((m) => (
              <option key={m} value={m}>
                {t(`ap_access_${m}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block">
          <Label icon={<Link2 className="h-3 w-3" />}>{t("admin_field_link")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={form.offer_url}
              onChange={(e) => {
                set("offer_url", e.target.value);
                setLinkCheck(null);
              }}
              className={cn(inputCls, "font-mono text-xs text-emerald-200 focus:border-emerald-400/60")}
              placeholder="https://track.example.com/?aff=123&sub={click_id}"
            />
            <Btn onClick={checkLink} loading={checkingLink} icon={<ShieldCheck className="h-3.5 w-3.5" />} className="shrink-0">
              {t("ap_check_link")}
            </Btn>
          </div>
          <Hint>{t("admin_link_hint")}</Hint>
        </label>
        {linkCheck && <CheckList result={linkCheck} />}
        <label className="block">
          <Label>{t("ap_subid_template")}</Label>
          <input
            value={form.subid_template}
            onChange={(e) => set("subid_template", e.target.value)}
            className={cn(inputCls, "font-mono text-xs")}
            placeholder="sub1={click_id}&sub2={category}&sub3={geo}"
          />
          <Hint>{t("ap_subid_hint")}</Hint>
        </label>
      </div>

      <div>
        <Label>{t("admin_field_images")}</Label>
        <div className="flex flex-wrap gap-3">
          {form.images.map((img, i) => (
            <div key={img.name} className="group relative h-20 w-28 overflow-hidden rounded-2xl border border-white/10">
              <img src={img.url} alt={`${form.name} ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={t("admin_delete")}
                onClick={() => set("images", form.images.filter((f) => f.name !== img.name))}
                className="absolute right-1 top-1 inline-flex h-7 w-7 touch-manipulation items-center justify-center rounded-full bg-black/70 text-white/80 transition hover:text-rose-300 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {form.images.length < MAX_IMAGES && (
            // The real file input is stretched over the tile (opacity 0) so mobile taps hit it directly.
            <div
              className={cn(
                "relative inline-flex h-20 w-28 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-white/45 transition focus-within:border-fuchsia-400/60 focus-within:text-white hover:border-fuchsia-400/50 hover:text-white",
                uploading && "opacity-60"
              )}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-bold">
                    {form.images.length}/{MAX_IMAGES}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={handleFiles}
                aria-label={t("admin_field_images")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
            </div>
          )}
        </div>
        <Hint>{t("admin_images_hint")}</Hint>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Label>{t("ap_tags")}</Label>
          <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="tag1, tag2" className={inputCls} />
        </label>
        <div>
          <Label>{t("ap_languages")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                title={l.label}
                onClick={() => set("languages", toggle(form.languages, l.code))}
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-bold uppercase transition",
                  form.languages.includes(l.code)
                    ? "bg-fuchsia-500/25 text-white ring-1 ring-inset ring-fuchsia-400/50"
                    : "bg-white/5 text-white/45 hover:text-white"
                )}
              >
                {l.flag} {l.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label>{t("ap_status")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {FORM_STATUSES.filter((s) => s !== "archived" || canManage || form.status === "archived").map((s) => (
              <Chip key={s} active={form.status === s} onClick={() => set("status", s)}>
                {t(`ap_status_${s}`)}
              </Chip>
            ))}
          </div>
          {form.status === "active" && initial.status !== "active" && <Hint>{t("ap_publish_hint")}</Hint>}
        </div>
        <button
          type="button"
          onClick={() => set("is_featured", form.is_featured === "yes" ? "no" : "yes")}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition",
            form.is_featured === "yes" ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-white/10 bg-white/5 text-white/45"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", form.is_featured === "yes" && "fill-current")} />
          {t("ap_top")}
        </button>
      </div>

      {(form.check_result || form._id) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>{t("ap_checks")}</Label>
            {form._id && (
              <Btn onClick={runFullCheck} loading={checkingAll} className="ml-auto px-3 py-1.5 text-[11px]" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {t("ap_run_checks")}
              </Btn>
            )}
          </div>
          {form.check_result ? <CheckList result={form.check_result} /> : <Hint>{t("ap_no_checks_yet")}</Hint>}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
        <Btn variant="primary" onClick={save} loading={saving} disabled={uploading} icon={<Save className="h-4 w-4" />} className="px-5 py-2.5 text-sm">
          {saving ? t("admin_saving") : t("admin_save")}
        </Btn>
        <Btn onClick={onClose} className="px-5 py-2.5 text-sm">
          {t("admin_cancel")}
        </Btn>
      </div>
    </div>
  );
}
