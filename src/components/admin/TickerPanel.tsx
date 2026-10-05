"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Radio, Plus, Pencil, Trash2, Save, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LANGUAGE_COUNT } from "@/lib/languages";
import {
  PanelHeader, Field, SelectBox, Switch, Chip, Loading, Empty, EditorCard, TranslationEditor, inputCls, primaryBtn,
  ghostBtn, iconBtn, dangerIconBtn, toLocalInput, fromLocalInput, formatDate, isLive, errorText,
} from "./panelKit";

const KINDS = ["news", "novelty", "new_showcase"];

interface TickerItem {
  _id: string;
  text: string;
  link?: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  is_enabled?: string;
  translations: Record<string, string>;
}

interface FormState {
  _id?: string;
  text: string;
  link: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  is_enabled: boolean;
  translations: Record<string, string>;
}

const EMPTY: FormState = { text: "", link: "", kind: "news", starts_at: "", ends_at: "", is_enabled: true, translations: {} };

/** Running ticker lines; text is auto-translated on save, translations can be fixed by hand. */
export function TickerPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [retranslating, setRetranslating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: TickerItem[] }>("/api/admin/ticker");
    if (res.ok && res.data) {
      setItems(res.data.items);
      console.log(`[ticker] loaded ${res.data.items.length} items`);
    } else {
      console.error("[ticker] load failed:", res.error);
      toast.error(errorText(res.error, t));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function fromItem(i: TickerItem): FormState {
    return {
      _id: i._id, text: i.text ?? "", link: i.link ?? "", kind: i.kind ?? "news", starts_at: toLocalInput(i.starts_at),
      ends_at: toLocalInput(i.ends_at), is_enabled: i.is_enabled !== "no", translations: i.translations ?? {},
    };
  }

  function applySaved(item: TickerItem) {
    setItems((prev) => (prev.some((x) => x._id === item._id) ? prev.map((x) => (x._id === item._id ? item : x)) : [item, ...prev]));
  }

  async function save() {
    if (!form) return;
    if (!form.text.trim()) return void toast.error(t("a2_text_required"));
    setSaving(true);
    const body = {
      text: form.text, link: form.link.trim(), kind: form.kind, starts_at: fromLocalInput(form.starts_at),
      ends_at: fromLocalInput(form.ends_at), is_enabled: form.is_enabled ? "yes" : "no",
    };
    const res = form._id
      ? await api.put<{ item: TickerItem }>(`/api/admin/ticker/${form._id}`, body)
      : await api.post<{ item: TickerItem }>("/api/admin/ticker", body);
    setSaving(false);
    if (!res.ok || !res.data) {
      console.error("[ticker] save failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    const item = res.data.item;
    applySaved(item);
    toast.success(t("a2_saved_translated", { n: Object.keys(item.translations).length }));
    console.log(`[ticker] saved ${item._id}, ${Object.keys(item.translations).length} translations`);
    // Keep the editor open on the saved item so translations can be checked right away.
    setForm(fromItem(item));
  }

  async function saveTranslation(lang: string, text: string): Promise<boolean> {
    if (!form?._id) return false;
    const res = await api.put<{ item: TickerItem }>(`/api/admin/ticker/${form._id}`, { translation: { lang, text } });
    if (!res.ok || !res.data) {
      toast.error(errorText(res.error, t));
      return false;
    }
    applySaved(res.data.item);
    setForm((f) => (f ? { ...f, translations: res.data!.item.translations } : f));
    toast.success(t("a2_saved"));
    return true;
  }

  async function retranslate() {
    if (!form?._id) return;
    setRetranslating(true);
    const res = await api.put<{ item: TickerItem }>(`/api/admin/ticker/${form._id}`, { retranslate: true });
    setRetranslating(false);
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    applySaved(res.data.item);
    setForm((f) => (f ? { ...f, translations: res.data!.item.translations } : f));
    toast.success(t("a2_saved_translated", { n: Object.keys(res.data.item.translations).length }));
  }

  async function toggle(i: TickerItem) {
    const res = await api.put<{ item: TickerItem }>(`/api/admin/ticker/${i._id}`, { is_enabled: i.is_enabled === "no" ? "yes" : "no" });
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    applySaved(res.data.item);
  }

  async function remove(i: TickerItem) {
    if (!window.confirm(`${t("a2_confirm_delete")}\n\n${i.text}`)) return;
    const res = await api.delete(`/api/admin/ticker/${i._id}`);
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t("a2_deleted"));
    setItems((prev) => prev.filter((x) => x._id !== i._id));
    if (form?._id === i._id) setForm(null);
  }

  return (
    <section className="mt-6 space-y-4">
      <PanelHeader
        icon={<Radio className="h-5 w-5" />}
        title={t("a2_ticker_title")}
        subtitle={t("a2_ticker_sub")}
        action={
          <button type="button" onClick={() => setForm({ ...EMPTY })} className={primaryBtn + " px-4 py-2 text-xs"}>
            <Plus className="h-4 w-4" />
            {t("a2_add")}
          </button>
        }
      />

      {form && (
        <EditorCard title={form._id ? t("a2_edit") : t("a2_ticker_new")} onClose={() => setForm(null)} closeLabel={t("a2_cancel")}>
          <Field label={t("a2_text")} hint={t("a2_auto_translate_hint")}>
            <input value={form.text} maxLength={280} onChange={(e) => setForm({ ...form, text: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_link")} hint={t("a2_link_hint")}>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputCls} placeholder="/catalog?category=ai" />
            </Field>
            <Field label={t("a2_kind")}>
              <SelectBox value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={KINDS.map((k) => ({ value: k, label: t(`a2_kind_${k}`) }))} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_starts_at")}>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t("a2_ends_at")}>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Switch checked={form.is_enabled} onChange={(v) => setForm({ ...form, is_enabled: v })} label={form.is_enabled ? t("a2_enabled") : t("a2_disabled")} />

          {form._id && (
            <div className="space-y-2">
              <TranslationEditor translations={form.translations} onSave={saveTranslation} t={t} />
              <button type="button" onClick={retranslate} disabled={retranslating} className={ghostBtn}>
                {retranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                {t("a2_retranslate")}
              </button>
            </div>
          )}

          <div className="flex gap-2 border-t border-white/5 pt-4">
            <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("a2_saving_translating") : t("a2_save")}
            </button>
            <button type="button" onClick={() => setForm(null)} className={ghostBtn + " px-5 py-2.5 text-sm"}>
              {t("a2_close")}
            </button>
          </div>
        </EditorCard>
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text={t("a2_empty")} />
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i._id} className="fp-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{i.text}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {isLive(i) ? <Chip tone="ok">{t("a2_live")}</Chip> : <Chip>{i.is_enabled === "no" ? t("a2_disabled") : t("a2_scheduled")}</Chip>}
                  <Chip tone="info">{t(`a2_kind_${i.kind || "news"}`)}</Chip>
                  <Chip>{t("a2_translations_count", { n: Object.keys(i.translations).length, total: LANGUAGE_COUNT })}</Chip>
                  {(i.starts_at || i.ends_at) && <Chip>{formatDate(i.starts_at)} → {formatDate(i.ends_at)}</Chip>}
                  {i.link && <Chip>{i.link}</Chip>}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => toggle(i)} className={ghostBtn}>
                  {i.is_enabled === "no" ? t("a2_enable") : t("a2_disable")}
                </button>
                <button type="button" onClick={() => setForm(fromItem(i))} aria-label={t("a2_edit")} className={iconBtn}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(i)} aria-label={t("a2_delete")} className={dangerIconBtn}>
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
