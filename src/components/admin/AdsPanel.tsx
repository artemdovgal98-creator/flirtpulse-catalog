"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Save, Loader2, ImagePlus, X, Code2, Image as ImageIcon, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  PanelHeader, Field, SelectBox, Switch, Chip, Loading, Empty, EditorCard, inputCls, monoCls, primaryBtn, ghostBtn,
  iconBtn, dangerIconBtn, toLocalInput, fromLocalInput, formatDate, isLive, errorText,
} from "./panelKit";

const SLOTS = ["home_between_categories", "catalog_inline", "showcase_page", "ai_section", "sex_shop", "bottom_banner"];
const DEVICES = ["all", "mobile", "desktop"];
const MAX_BYTES = 10 * 1024 * 1024;

interface AdItem {
  _id: string;
  name: string;
  slot: string;
  device: string;
  geo?: string;
  language?: string;
  kind: "html" | "image";
  html?: string;
  image?: { name: string; url: string } | null;
  link_url?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;
  is_enabled?: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface FormState {
  _id?: string;
  name: string;
  slot: string;
  device: string;
  geo: string;
  language: string;
  kind: "html" | "image";
  html: string;
  image: { name: string; url: string } | null;
  link_url: string;
  starts_at: string;
  ends_at: string;
  priority: string;
  is_enabled: boolean;
}

const EMPTY: FormState = {
  name: "", slot: "catalog_inline", device: "all", geo: "", language: "", kind: "image", html: "", image: null,
  link_url: "", starts_at: "", ends_at: "", priority: "0", is_enabled: true,
};

/** Ad tags per slot with device / GEO / language targeting, schedule and CTR. */
export function AdsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slotFilter, setSlotFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: AdItem[] }>("/api/admin/ads");
    if (res.ok && res.data) {
      setItems(res.data.items);
      console.log(`[ads] loaded ${res.data.items.length} ad tags`);
    } else {
      console.error("[ads] load failed:", res.error);
      toast.error(errorText(res.error, t));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function edit(a: AdItem) {
    setForm({
      _id: a._id, name: a.name ?? "", slot: a.slot ?? "catalog_inline", device: a.device ?? "all", geo: a.geo ?? "",
      language: a.language ?? "", kind: a.kind ?? "html", html: a.html ?? "",
      image: a.image?.name ? { name: a.image.name, url: a.image.url } : null, link_url: a.link_url ?? "",
      starts_at: toLocalInput(a.starts_at), ends_at: toLocalInput(a.ends_at), priority: String(a.priority ?? 0),
      is_enabled: a.is_enabled !== "no",
    });
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!form || !file) return;
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name}: ${(file.size / 1048576).toFixed(1)} MB > 10 MB`);
      return;
    }
    setUploading(true);
    const payload = new FormData();
    payload.append("files", file);
    const res = await api.upload<{ files: Array<{ name: string; url: string }> }>("/api/admin/upload", payload);
    setUploading(false);
    const uploaded = res.data?.files?.find((f) => f?.name);
    if (!res.ok || !uploaded) {
      console.error("[ads] upload failed:", res.error);
      toast.error(errorText(res.error ?? t("a2_upload_failed"), t));
      return;
    }
    setForm((prev) => (prev ? { ...prev, image: uploaded } : prev));
    console.log(`[ads] uploaded banner ${uploaded.name}`);
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return void toast.error(t("a2_name_required"));
    if (form.kind === "image" && !form.image) return void toast.error(t("a2_ads_need_image"));
    if (form.kind === "html" && !form.html.trim()) return void toast.error(t("a2_ads_need_html"));
    setSaving(true);
    const body = {
      name: form.name, slot: form.slot, device: form.device, geo: form.geo, language: form.language, kind: form.kind,
      html: form.html, image: form.image ? { name: form.image.name } : null, link_url: form.link_url.trim(),
      starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at),
      priority: Number(form.priority) || 0, is_enabled: form.is_enabled ? "yes" : "no",
    };
    const res = form._id
      ? await api.put<{ item: AdItem }>(`/api/admin/ads/${form._id}`, body)
      : await api.post<{ item: AdItem }>("/api/admin/ads", body);
    setSaving(false);
    if (!res.ok) {
      console.error("[ads] save failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    toast.success(form._id ? t("a2_saved") : t("a2_created"));
    setForm(null);
    load();
  }

  async function toggle(a: AdItem) {
    const res = await api.put<{ item: AdItem }>(`/api/admin/ads/${a._id}`, { is_enabled: a.is_enabled === "no" ? "yes" : "no" });
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    setItems((prev) => prev.map((x) => (x._id === a._id ? res.data!.item : x)));
  }

  async function resetStats(a: AdItem) {
    if (!window.confirm(t("a2_ads_reset_confirm"))) return;
    const res = await api.put<{ item: AdItem }>(`/api/admin/ads/${a._id}`, { reset_stats: true });
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    setItems((prev) => prev.map((x) => (x._id === a._id ? res.data!.item : x)));
    toast.success(t("a2_saved"));
  }

  async function remove(a: AdItem) {
    if (!window.confirm(`${t("a2_confirm_delete")}\n\n${a.name}`)) return;
    const res = await api.delete(`/api/admin/ads/${a._id}`);
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t("a2_deleted"));
    setItems((prev) => prev.filter((x) => x._id !== a._id));
  }

  const visible = slotFilter ? items.filter((a) => a.slot === slotFilter) : items;

  return (
    <section className="mt-6 space-y-4">
      <PanelHeader
        icon={<Megaphone className="h-5 w-5" />}
        title={t("a2_ads_title")}
        subtitle={t("a2_ads_sub")}
        action={
          <button type="button" onClick={() => setForm({ ...EMPTY })} className={primaryBtn + " px-4 py-2 text-xs"}>
            <Plus className="h-4 w-4" />
            {t("a2_add")}
          </button>
        }
      />

      {form && (
        <EditorCard title={form._id ? t("a2_edit") : t("a2_ads_new")} onClose={() => setForm(null)} closeLabel={t("a2_cancel")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_name")}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("a2_ads_slot")}>
              <SelectBox value={form.slot} onChange={(v) => setForm({ ...form, slot: v })} options={SLOTS.map((s) => ({ value: s, label: t(`a2_slot_${s}`) }))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("a2_ads_device")}>
              <SelectBox value={form.device} onChange={(v) => setForm({ ...form, device: v })} options={DEVICES.map((d) => ({ value: d, label: t(`a2_device_${d}`) }))} />
            </Field>
            <Field label={t("a2_geo")} hint={t("a2_geo_hint")}>
              <input value={form.geo} onChange={(e) => setForm({ ...form, geo: e.target.value })} className={inputCls} placeholder="DE,UA" />
            </Field>
            <Field label={t("a2_ads_language")} hint={t("a2_ads_language_hint")}>
              <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputCls} placeholder="en,de" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["image", "html"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm({ ...form, kind: k })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition active:scale-95",
                  form.kind === k ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white" : "border-white/10 bg-white/5 text-white/50"
                )}
              >
                {k === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <Code2 className="h-3.5 w-3.5" />}
                {t(`a2_ads_kind_${k}`)}
              </button>
            ))}
          </div>

          {form.kind === "html" ? (
            <Field label={t("a2_ads_html")} hint={t("a2_ads_html_hint")}>
              <textarea value={form.html} rows={6} onChange={(e) => setForm({ ...form, html: e.target.value })} className={monoCls + " resize-y"} placeholder="<script ...></script>" />
            </Field>
          ) : (
            <div>
              <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">{t("a2_ads_image")}</span>
              <div className="flex flex-wrap items-center gap-3">
                {form.image && (
                  <div className="relative h-24 w-40 overflow-hidden rounded-2xl border border-white/10">
                    <img src={form.image.url} alt={form.name} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      aria-label={t("a2_delete")}
                      onClick={() => setForm({ ...form, image: null })}
                      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 hover:text-rose-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className={cn("relative inline-flex h-24 w-40 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-white/45 transition hover:border-fuchsia-400/50 hover:text-white", uploading && "opacity-60")}>
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span className="text-[10px] font-bold">{form.image ? t("a2_ads_replace") : t("a2_ads_upload")}</span>
                  <input type="file" accept="image/*" disabled={uploading} onChange={handleFile} aria-label={t("a2_ads_image")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                </div>
              </div>
            </div>
          )}

          <Field label={t("a2_ads_link")}>
            <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className={monoCls} placeholder="https://partner.example.com/?aff=1" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("a2_starts_at")}>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("a2_ends_at")}>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("a2_ads_priority")} hint={t("a2_ads_priority_hint")}>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls} />
            </Field>
          </div>

          <Switch checked={form.is_enabled} onChange={(v) => setForm({ ...form, is_enabled: v })} label={form.is_enabled ? t("a2_enabled") : t("a2_disabled")} />

          <div className="flex gap-2 border-t border-white/5 pt-4">
            <button type="button" onClick={save} disabled={saving || uploading} className={primaryBtn}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("a2_saving") : t("a2_save")}
            </button>
            <button type="button" onClick={() => setForm(null)} className={ghostBtn + " px-5 py-2.5 text-sm"}>
              {t("a2_cancel")}
            </button>
          </div>
        </EditorCard>
      )}

      <SelectBox
        value={slotFilter}
        onChange={setSlotFilter}
        className="sm:max-w-xs"
        ariaLabel={t("a2_ads_slot")}
        options={[{ value: "", label: t("a2_ads_all_slots") }, ...SLOTS.map((s) => ({ value: s, label: t(`a2_slot_${s}`) }))]}
      />

      {loading ? (
        <Loading />
      ) : visible.length === 0 ? (
        <Empty text={t("a2_empty")} />
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <li key={a._id} className="fp-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
              <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-white/40">
                {a.kind === "image" && a.image?.url ? <img src={a.image.url} alt={a.name} className="h-full w-full object-cover" /> : <Code2 className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                  <span className="truncate">{a.name}</span>
                  {isLive(a) ? <Chip tone="ok">{t("a2_live")}</Chip> : <Chip>{a.is_enabled === "no" ? t("a2_disabled") : t("a2_scheduled")}</Chip>}
                </p>
                <p className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-white/40">
                  <span>{t(`a2_slot_${a.slot}`)}</span>
                  <span>· {t(`a2_device_${a.device || "all"}`)}</span>
                  <span>· {a.geo || t("a2_all_geo")}</span>
                  <span>· {a.language || t("a2_all_langs")}</span>
                  <span>· P{a.priority ?? 0}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <Chip tone="info">{t("a2_ads_impressions", { n: a.impressions })}</Chip>
                  <Chip tone="info">{t("a2_ads_clicks", { n: a.clicks })}</Chip>
                  <Chip tone={a.ctr > 0 ? "ok" : "muted"}>CTR {a.ctr}%</Chip>
                  {(a.starts_at || a.ends_at) && <Chip>{formatDate(a.starts_at)} → {formatDate(a.ends_at)}</Chip>}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggle(a)} className={ghostBtn}>
                  {a.is_enabled === "no" ? t("a2_enable") : t("a2_disable")}
                </button>
                <button type="button" onClick={() => resetStats(a)} aria-label={t("a2_ads_reset")} title={t("a2_ads_reset")} className={iconBtn}>
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => edit(a)} aria-label={t("a2_edit")} className={iconBtn}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(a)} aria-label={t("a2_delete")} className={dangerIconBtn}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
