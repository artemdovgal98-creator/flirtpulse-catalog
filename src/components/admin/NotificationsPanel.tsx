"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, Plus, Pencil, Trash2, Save, Loader2, Send, Languages } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LANGUAGE_COUNT } from "@/lib/languages";
import { useCategories } from "@/components/CategoriesProvider";
import {
  PanelHeader, Field, SelectBox, Switch, Chip, Loading, Empty, EditorCard, TranslationEditor, inputCls, primaryBtn,
  ghostBtn, iconBtn, dangerIconBtn, toLocalInput, fromLocalInput, formatDate, errorText,
} from "./panelKit";

const TYPES = ["news", "novelty", "new_showcase"];

interface Translations {
  title: Record<string, string>;
  body: Record<string, string>;
}

interface NotificationItem {
  _id: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
  category?: string;
  is_enabled?: string;
  published_at?: string | null;
  translations: Translations;
  push_sent: number;
}

interface FormState {
  _id?: string;
  title: string;
  body: string;
  link: string;
  type: string;
  category: string;
  is_enabled: boolean;
  published_at: string;
  send_push: boolean;
  translations: Translations;
}

const emptyForm = (): FormState => ({
  title: "", body: "", link: "", type: "news", category: "", is_enabled: true, published_at: toLocalInput(new Date().toISOString()),
  send_push: false, translations: { title: {}, body: {} },
});

/** Bell notifications: auto-translated title + body, manual fixes per language, optional web push. */
export function NotificationsPanel() {
  const { t } = useI18n();
  const { categories, label } = useCategories();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: NotificationItem[] }>("/api/admin/notifications");
    if (res.ok && res.data) {
      setItems(res.data.items);
      console.log(`[notifications] loaded ${res.data.items.length}`);
    } else {
      console.error("[notifications] load failed:", res.error);
      toast.error(errorText(res.error, t));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function fromItem(n: NotificationItem): FormState {
    return {
      _id: n._id, title: n.title ?? "", body: n.body ?? "", link: n.link ?? "", type: n.type ?? "news", category: n.category ?? "",
      is_enabled: n.is_enabled !== "no", published_at: toLocalInput(n.published_at), send_push: false,
      translations: n.translations ?? { title: {}, body: {} },
    };
  }

  function applySaved(item: NotificationItem) {
    setItems((prev) => (prev.some((x) => x._id === item._id) ? prev.map((x) => (x._id === item._id ? item : x)) : [item, ...prev]));
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return void toast.error(t("a2_title_required"));
    setSaving(true);
    const body: Record<string, unknown> = {
      title: form.title, body: form.body, link: form.link.trim(), type: form.type, category: form.category,
      is_enabled: form.is_enabled ? "yes" : "no", published_at: fromLocalInput(form.published_at),
    };
    if (!form._id) body.send_push = form.send_push;
    const res = form._id
      ? await api.put<{ item: NotificationItem }>(`/api/admin/notifications/${form._id}`, body)
      : await api.post<{ item: NotificationItem; pushed: number | null }>("/api/admin/notifications", body);
    setSaving(false);
    if (!res.ok || !res.data) {
      console.error("[notifications] save failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    const item = res.data.item;
    applySaved(item);
    toast.success(t("a2_saved_translated", { n: Object.keys(item.translations.title).length }));
    const pushed = (res.data as { pushed?: number | null }).pushed;
    if (typeof pushed === "number") toast.success(t("a2_push_sent", { n: pushed }));
    console.log(`[notifications] saved ${item._id} pushed=${pushed ?? "-"}`);
    setForm(fromItem(item));
  }

  async function saveTranslation(field: "title" | "body", lang: string, text: string): Promise<boolean> {
    if (!form?._id) return false;
    const res = await api.put<{ item: NotificationItem }>(`/api/admin/notifications/${form._id}`, { translation: { field, lang, text } });
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
    setBusy("retranslate");
    const res = await api.put<{ item: NotificationItem }>(`/api/admin/notifications/${form._id}`, { retranslate: true });
    setBusy("");
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    applySaved(res.data.item);
    setForm((f) => (f ? { ...f, translations: res.data!.item.translations } : f));
    toast.success(t("a2_saved_translated", { n: Object.keys(res.data.item.translations.title).length }));
  }

  async function push(n: NotificationItem) {
    if (!window.confirm(t("a2_push_confirm", { target: n.category ? label(n.category) : t("a2_push_everyone") }))) return;
    setBusy(`push:${n._id}`);
    const res = await api.post<{ sent: number; push_sent: number }>(`/api/admin/notifications/${n._id}/push`, {});
    setBusy("");
    if (!res.ok || !res.data) {
      console.error("[notifications] push failed:", res.error);
      return void toast.error(errorText(res.error, t));
    }
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, push_sent: res.data!.push_sent } : x)));
    toast.success(t("a2_push_sent", { n: res.data.sent }));
  }

  async function toggle(n: NotificationItem) {
    const res = await api.put<{ item: NotificationItem }>(`/api/admin/notifications/${n._id}`, { is_enabled: n.is_enabled === "no" ? "yes" : "no" });
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    applySaved(res.data.item);
  }

  async function remove(n: NotificationItem) {
    if (!window.confirm(`${t("a2_confirm_delete")}\n\n${n.title}`)) return;
    const res = await api.delete(`/api/admin/notifications/${n._id}`);
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t("a2_deleted"));
    setItems((prev) => prev.filter((x) => x._id !== n._id));
    if (form?._id === n._id) setForm(null);
  }

  const categoryOptions = [
    { value: "", label: t("a2_no_category") },
    ...categories.map((c) => ({ value: c.key, label: `${c.emoji ?? ""} ${label(c.key)}`.trim() })),
  ];
  if (form?.category && !categories.some((c) => c.key === form.category)) {
    categoryOptions.push({ value: form.category, label: form.category });
  }

  return (
    <section className="mt-6 space-y-4">
      <PanelHeader
        icon={<Bell className="h-5 w-5" />}
        title={t("a2_notif_title")}
        subtitle={t("a2_notif_sub")}
        action={
          <button type="button" onClick={() => setForm(emptyForm())} className={primaryBtn + " px-4 py-2 text-xs"}>
            <Plus className="h-4 w-4" />
            {t("a2_add")}
          </button>
        }
      />

      {form && (
        <EditorCard title={form._id ? t("a2_edit") : t("a2_notif_new")} onClose={() => setForm(null)} closeLabel={t("a2_cancel")}>
          <Field label={t("a2_title")} hint={t("a2_auto_translate_hint")}>
            <input value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label={t("a2_body")}>
            <textarea value={form.body} rows={3} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputCls + " resize-y"} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("a2_link")} hint={t("a2_link_hint")}>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className={inputCls} placeholder="/offer/..." />
            </Field>
            <Field label={t("a2_kind")}>
              <SelectBox value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES.map((k) => ({ value: k, label: t(`a2_kind_${k}`) }))} />
            </Field>
            <Field label={t("a2_category")} hint={t("a2_notif_category_hint")}>
              <SelectBox value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={categoryOptions} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_published_at")}>
              <input type="datetime-local" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} className={inputCls} />
            </Field>
            <div className="flex flex-wrap items-end gap-2">
              <Switch checked={form.is_enabled} onChange={(v) => setForm({ ...form, is_enabled: v })} label={form.is_enabled ? t("a2_enabled") : t("a2_disabled")} />
              {!form._id && (
                <Switch checked={form.send_push} onChange={(v) => setForm({ ...form, send_push: v })} label={t("a2_send_push")} />
              )}
            </div>
          </div>

          {form._id && (
            <div className="space-y-2">
              <TranslationEditor
                label={t("a2_title")}
                translations={form.translations.title}
                onSave={(lang, text) => saveTranslation("title", lang, text)}
                t={t}
              />
              <TranslationEditor
                label={t("a2_body")}
                multiline
                translations={form.translations.body}
                onSave={(lang, text) => saveTranslation("body", lang, text)}
                t={t}
              />
              <button type="button" onClick={retranslate} disabled={busy === "retranslate"} className={ghostBtn}>
                {busy === "retranslate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
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
          {items.map((n) => (
            <li key={n._id} className="fp-card flex flex-wrap items-center gap-3 rounded-2xl p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-white/45">{n.body}</p>}
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {n.is_enabled === "no" ? <Chip>{t("a2_disabled")}</Chip> : <Chip tone="ok">{t("a2_enabled")}</Chip>}
                  <Chip tone="info">{t(`a2_kind_${n.type || "news"}`)}</Chip>
                  {n.category && <Chip>{label(n.category)}</Chip>}
                  <Chip>{formatDate(n.published_at)}</Chip>
                  <Chip>{t("a2_translations_count", { n: Object.keys(n.translations.title).length, total: LANGUAGE_COUNT })}</Chip>
                  {n.push_sent > 0 && <Chip tone="ok">{t("a2_push_sent_chip", { n: n.push_sent })}</Chip>}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => push(n)} disabled={busy === `push:${n._id}` || n.is_enabled === "no"} className={ghostBtn}>
                  {busy === `push:${n._id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t("a2_send_push")}
                </button>
                <button type="button" onClick={() => toggle(n)} className={ghostBtn}>
                  {n.is_enabled === "no" ? t("a2_enable") : t("a2_disable")}
                </button>
                <button type="button" onClick={() => setForm(fromItem(n))} aria-label={t("a2_edit")} className={iconBtn}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remove(n)} aria-label={t("a2_delete")} className={dangerIconBtn}>
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
