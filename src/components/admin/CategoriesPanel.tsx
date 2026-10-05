"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Languages, Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AI_SUBFILTERS, COLOR_DOT, COLOR_GRADIENT } from "@/lib/catalog";
import { Btn, Card, Chip, Empty, Hint, Label, PanelTitle, Spinner, Toggle, inputCls } from "@/components/admin/adminKit";
import type { AdminCategory } from "@/components/admin/ShowcaseForm";

interface CatForm {
  _id?: string;
  key: string;
  label: string;
  emoji: string;
  color: string;
  sort_order: number;
  geo_only: string;
  subfilters: string[];
  is_enabled: string;
}

const EMPTY: CatForm = {
  key: "",
  label: "",
  emoji: "✨",
  color: "fuchsia",
  sort_order: 99,
  geo_only: "",
  subfilters: [],
  is_enabled: "yes",
};

function errorText(t: (k: string) => string, err: unknown) {
  const code = String(err ?? "Error");
  const known = ["INVALID_KEY", "KEY_EXISTS", "LABEL_REQUIRED", "ADMIN_ROLE_REQUIRED"];
  return known.includes(code) ? t(`ap_err_${code.toLowerCase()}`) : code;
}

/** Catalog categories (catalog_category): add, edit, reorder, GEO-restrict, disable. */
export function CategoriesPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CatForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: AdminCategory[] }>("/api/admin/categories");
    setLoading(false);
    if (!res.ok || !res.data) {
      console.error("[categories] load failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setItems(res.data.items);
    console.log(`[categories] ${res.data.items.length} categories`);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function edit(c: AdminCategory) {
    setForm({
      _id: c._id,
      key: c.key,
      label: c.label,
      emoji: c.emoji,
      color: c.color,
      sort_order: c.sort_order,
      geo_only: c.geo_only,
      subfilters: String(c.subfilters || "").split(",").map((s) => s.trim()).filter(Boolean),
      is_enabled: c.is_enabled,
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const body = { ...form, subfilters: form.subfilters.join(",") };
    const res = form._id ? await api.put(`/api/admin/categories/${form._id}`, body) : await api.post("/api/admin/categories", body);
    setSaving(false);
    if (!res.ok) {
      console.error("[categories] save failed:", res.error);
      toast.error(errorText(t, res.error));
      return;
    }
    toast.success(form._id ? t("admin_updated") : t("admin_created"));
    setForm(null);
    load();
  }

  async function remove(c: AdminCategory) {
    const msg = c.offers > 0 ? t("ap_cat_disable_confirm", { n: c.offers }) : t("ap_cat_delete_confirm");
    if (!window.confirm(`${msg}\n\n${c.label}`)) return;
    const res = await api.delete<{ disabled?: boolean }>(`/api/admin/categories/${c._id}`);
    if (!res.ok) {
      toast.error(errorText(t, res.error));
      return;
    }
    toast.success(res.data?.disabled ? t("ap_cat_disabled") : t("admin_deleted"));
    load();
  }

  async function toggleEnabled(c: AdminCategory) {
    const res = await api.put(`/api/admin/categories/${c._id}`, { is_enabled: c.is_enabled === "no" ? "yes" : "no" });
    if (!res.ok) {
      toast.error(errorText(t, res.error));
      return;
    }
    load();
  }

  return (
    <section className="space-y-4">
      <PanelTitle title={t("ap_tab_categories")}>
        {canManage && (
          <Btn variant="primary" onClick={() => setForm({ ...EMPTY, sort_order: items.length + 1 })} icon={<Plus className="h-4 w-4" />}>
            {t("ap_cat_add")}
          </Btn>
        )}
      </PanelTitle>
      {!canManage && <Hint>{t("ap_admin_role_required")}</Hint>}

      {form && (
        <Card className="fp-rise space-y-3">
          <div className="flex items-center">
            <h3 className="font-display text-sm font-extrabold text-white">{form._id ? t("admin_edit") : t("ap_cat_add")}</h3>
            <button
              type="button"
              onClick={() => setForm(null)}
              aria-label={t("admin_cancel")}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_80px]">
            <label className="block">
              <Label>{t("ap_cat_key")}</Label>
              <input
                value={form.key}
                disabled={Boolean(form._id)}
                onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                className={cn(inputCls, "font-mono disabled:opacity-50")}
                placeholder="new_category"
              />
            </label>
            <label className="block">
              <Label>{t("ap_cat_label")}</Label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <Label>{t("ap_cat_emoji")}</Label>
              <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className={cn(inputCls, "text-center")} maxLength={8} />
            </label>
          </div>
          <Hint>{t("ap_cat_key_hint")}</Hint>
          <div>
            <Label>{t("ap_cat_color")}</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(COLOR_GRADIENT).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    "h-8 w-8 rounded-full bg-gradient-to-br ring-2 ring-offset-2 ring-offset-[#0d0a18] transition",
                    COLOR_GRADIENT[c],
                    form.color === c ? "ring-white" : "ring-transparent"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Label>{t("ap_cat_order")}</Label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <Label>{t("ap_cat_geo_only")}</Label>
              <input
                value={form.geo_only}
                onChange={(e) => setForm({ ...form, geo_only: e.target.value })}
                className={cn(inputCls, "uppercase")}
                placeholder="ua, pl"
              />
              <Hint>{t("ap_cat_geo_hint")}</Hint>
            </label>
          </div>
          <div>
            <Label>{t("ap_subfilters")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {AI_SUBFILTERS.map((s) => (
                <Chip
                  key={s}
                  active={form.subfilters.includes(s)}
                  onClick={() =>
                    setForm({
                      ...form,
                      subfilters: form.subfilters.includes(s) ? form.subfilters.filter((x) => x !== s) : [...form.subfilters, s],
                    })
                  }
                >
                  {t(`ap_sub_${s}`)}
                </Chip>
              ))}
            </div>
          </div>
          <Toggle
            checked={form.is_enabled !== "no"}
            onChange={(v) => setForm({ ...form, is_enabled: v ? "yes" : "no" })}
            label={t("ap_cat_enabled")}
          />
          <Hint>{t("ap_cat_translate_hint")}</Hint>
          <div className="flex gap-2 border-t border-white/5 pt-3">
            <Btn variant="primary" onClick={save} loading={saving} icon={<Save className="h-4 w-4" />}>
              {t("admin_save")}
            </Btn>
            <Btn onClick={() => setForm(null)}>{t("admin_cancel")}</Btn>
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : !items.length ? (
        <Empty>{t("admin_empty")}</Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c._id} className={cn("fp-card flex items-center gap-3 rounded-2xl p-3", c.is_enabled === "no" && "opacity-60")}>
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl",
                  COLOR_GRADIENT[c.color] ?? COLOR_GRADIENT.fuchsia
                )}
              >
                {c.emoji || "✨"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-bold text-white">
                  {c.label}
                  <span className="font-mono text-[10px] font-normal text-white/35">{c.key}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/40">
                  <span className="inline-flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", COLOR_DOT[c.color] ?? "bg-fuchsia-400")} />#{c.sort_order}
                  </span>
                  <span>· {t("ap_cat_offers", { n: c.offers })}</span>
                  {c.geo_only && <span>· GEO: {c.geo_only.toUpperCase()}</span>}
                  <span className="inline-flex items-center gap-0.5">
                    · <Languages className="h-3 w-3" /> {Object.keys(c.translations || {}).length}
                  </span>
                  {c.is_enabled === "no" && <span className="text-rose-300">· {t("ap_cat_off")}</span>}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(c)}
                    aria-label={t("ap_cat_enabled")}
                    title={t("ap_cat_enabled")}
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-90",
                      c.is_enabled === "no" ? "border-white/10 bg-white/5 text-white/40" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    )}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => edit(c)}
                    aria-label={t("admin_edit")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white active:scale-90"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    aria-label={t("admin_delete")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 active:scale-90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
