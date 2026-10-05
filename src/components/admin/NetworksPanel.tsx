"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Network, Plus, Pencil, Trash2, Save, Loader2, FlaskConical, Eye, Copy, RefreshCw, KeyRound, CheckCircle2,
  AlertTriangle, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { PAYOUT_MODELS } from "@/lib/catalog";
import {
  PanelHeader, Field, SelectBox, Chip, Loading, Empty, EditorCard, inputCls, monoCls, primaryBtn, ghostBtn,
  iconBtn, dangerIconBtn, formatDate, errorText,
} from "./panelKit";

interface NetworkItem {
  _id: string;
  name: string;
  slug: string;
  link_template: string;
  api_url: string;
  api_key_masked: string;
  has_api_key: boolean;
  has_secret: boolean;
  postback_url_masked: string;
  geo: string;
  payout_model: string;
  status: string;
  notes: string;
  last_test_at: string | null;
  last_test_result: string;
  offers: number;
  conversions: number;
}

interface TestCheck {
  key: string;
  ok: boolean;
  warn?: boolean;
  detail?: string;
}

interface FormState {
  _id?: string;
  name: string;
  slug: string;
  link_template: string;
  api_url: string;
  api_key: string;
  api_key_masked: string;
  clear_api_key: boolean;
  geo: string;
  payout_model: string;
  status: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "", slug: "", link_template: "", api_url: "", api_key: "", api_key_masked: "", clear_api_key: false,
  geo: "", payout_model: "", status: "pending", notes: "",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "bad"> = { connected: "ok", pending: "warn", error: "bad" };

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("[networks] clipboard failed:", err);
    return false;
  }
}

/** Affiliate networks: links, postback, API test. Secrets never reach the browser unless revealed. */
export function NetworksPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState<NetworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, TestCheck[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: NetworkItem[] }>("/api/admin/networks");
    if (res.ok && res.data) {
      setItems(res.data.items);
      console.log(`[networks] loaded ${res.data.items.length} networks`);
    } else {
      console.error("[networks] load failed:", res.error);
      toast.error(errorText(res.error, t));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function replace(item: NetworkItem) {
    setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, ...item, offers: n.offers, conversions: n.conversions } : n)));
  }

  function edit(n: NetworkItem) {
    setForm({
      _id: n._id, name: n.name, slug: n.slug, link_template: n.link_template, api_url: n.api_url, api_key: "",
      api_key_masked: n.api_key_masked, clear_api_key: false, geo: n.geo, payout_model: n.payout_model,
      status: n.status, notes: n.notes,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error(t("a2_name_required"));
      return;
    }
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name, link_template: form.link_template, api_url: form.api_url, geo: form.geo,
      payout_model: form.payout_model, status: form.status, notes: form.notes,
    };
    if (form._id && form.slug.trim()) body.slug = form.slug;
    if (form.api_key.trim()) body.api_key = form.api_key.trim();
    else if (form.clear_api_key) body.clear_api_key = true;

    const res = form._id
      ? await api.put<{ item: NetworkItem }>(`/api/admin/networks/${form._id}`, body)
      : await api.post<{ item: NetworkItem }>("/api/admin/networks", body);
    setSaving(false);
    if (!res.ok || !res.data) {
      console.error("[networks] save failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    toast.success(form._id ? t("a2_saved") : t("a2_created"));
    console.log(`[networks] saved ${res.data.item._id} (${res.data.item.slug})`);
    if (form._id) {
      replace(res.data.item);
      setRevealed((r) => ({ ...r, [res.data!.item._id]: "" }));
    } else {
      load();
    }
    setForm(null);
  }

  async function remove(n: NetworkItem) {
    if (!window.confirm(`${t("a2_confirm_delete")}\n\n${n.name}`)) return;
    setBusy(`del:${n._id}`);
    const res = await api.delete(`/api/admin/networks/${n._id}`);
    setBusy("");
    if (!res.ok) {
      console.error("[networks] delete refused/failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    toast.success(t("a2_deleted"));
    setItems((prev) => prev.filter((x) => x._id !== n._id));
  }

  async function test(n: NetworkItem) {
    setBusy(`test:${n._id}`);
    const res = await api.post<{ status: string; result: string; checks: TestCheck[]; last_test_at: string }>(
      `/api/admin/networks/${n._id}/test`,
      {}
    );
    setBusy("");
    if (!res.ok || !res.data) {
      console.error("[networks] test failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    const d = res.data;
    console.log(`[networks] test ${n.slug}: ${d.status} — ${d.result}`);
    setItems((prev) =>
      prev.map((x) => (x._id === n._id ? { ...x, status: d.status, last_test_result: d.result, last_test_at: d.last_test_at } : x))
    );
    setChecks((c) => ({ ...c, [n._id]: d.checks }));
    if (d.status === "error") toast.error(d.result);
    else toast.success(d.result);
  }

  async function reveal(n: NetworkItem) {
    if (revealed[n._id]) {
      setRevealed((r) => ({ ...r, [n._id]: "" }));
      return;
    }
    setBusy(`reveal:${n._id}`);
    const res = await api.post<{ url: string }>(`/api/admin/networks/${n._id}/reveal`, {});
    setBusy("");
    if (!res.ok || !res.data) {
      console.error("[networks] reveal failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    setRevealed((r) => ({ ...r, [n._id]: res.data!.url }));
  }

  async function regenerate(n: NetworkItem) {
    if (!window.confirm(t("a2_net_regen_confirm"))) return;
    setBusy(`regen:${n._id}`);
    const res = await api.put<{ item: NetworkItem }>(`/api/admin/networks/${n._id}`, { regenerate_secret: true });
    setBusy("");
    if (!res.ok || !res.data) {
      console.error("[networks] regenerate failed:", res.error);
      toast.error(errorText(res.error, t));
      return;
    }
    replace(res.data.item);
    setRevealed((r) => ({ ...r, [n._id]: "" }));
    toast.success(t("a2_net_regen_done"));
  }

  return (
    <section className="mt-6 space-y-4">
      <PanelHeader
        icon={<Network className="h-5 w-5" />}
        title={t("a2_networks_title")}
        subtitle={t("a2_networks_sub")}
        action={
          <button type="button" onClick={() => setForm({ ...EMPTY })} className={primaryBtn + " px-4 py-2 text-xs"}>
            <Plus className="h-4 w-4" />
            {t("a2_add")}
          </button>
        }
      />

      {form && (
        <EditorCard
          title={form._id ? t("a2_edit") : t("a2_net_new")}
          onClose={() => setForm(null)}
          closeLabel={t("a2_cancel")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_net_name")}>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="CrakRevenue" />
            </Field>
            <Field label={t("a2_net_slug")} hint={form._id ? t("a2_net_slug_hint_edit") : t("a2_net_slug_hint")}>
              <input
                value={form.slug}
                disabled={!form._id}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={monoCls}
                placeholder="auto"
              />
            </Field>
          </div>

          <Field label={t("a2_net_link_template")} hint={t("a2_net_link_template_hint")}>
            <input
              value={form.link_template}
              onChange={(e) => setForm({ ...form, link_template: e.target.value })}
              className={monoCls}
              placeholder="sub1={click_id}&sub2={category}"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("a2_net_api_url")}>
              <input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} className={monoCls} placeholder="https://api.network.com/v1/me" />
            </Field>
            <Field label={t("a2_net_api_key")} hint={form.api_key_masked ? `${t("a2_net_api_key_current")}: ${form.api_key_masked}` : t("a2_net_api_key_hint")}>
              <input
                type="password"
                autoComplete="new-password"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value, clear_api_key: false })}
                className={monoCls}
                placeholder={form.api_key_masked || "••••••••"}
              />
            </Field>
          </div>
          {form._id && form.api_key_masked && !form.api_key && (
            <label className="flex items-center gap-2 text-xs text-white/50">
              <input type="checkbox" checked={form.clear_api_key} onChange={(e) => setForm({ ...form, clear_api_key: e.target.checked })} />
              {t("a2_net_clear_key")}
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("a2_geo")} hint={t("a2_geo_hint")}>
              <input value={form.geo} onChange={(e) => setForm({ ...form, geo: e.target.value })} className={inputCls} placeholder="DE,AT,CH" />
            </Field>
            <Field label={t("a2_net_payout")}>
              <SelectBox
                value={form.payout_model}
                onChange={(v) => setForm({ ...form, payout_model: v })}
                options={[{ value: "", label: "—" }, ...PAYOUT_MODELS.map((p: string) => ({ value: p, label: p }))]}
              />
            </Field>
            <Field label={t("a2_status")}>
              <SelectBox
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={["pending", "connected", "error"].map((s) => ({ value: s, label: t(`a2_net_status_${s}`) }))}
              />
            </Field>
          </div>

          <Field label={t("a2_notes")}>
            <textarea value={form.notes} rows={2} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls + " resize-y"} />
          </Field>

          <div className="flex gap-2 border-t border-white/5 pt-4">
            <button type="button" onClick={save} disabled={saving} className={primaryBtn}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("a2_saving") : t("a2_save")}
            </button>
            <button type="button" onClick={() => setForm(null)} className={ghostBtn + " px-5 py-2.5 text-sm"}>
              {t("a2_cancel")}
            </button>
          </div>
        </EditorCard>
      )}

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty text={t("a2_empty")} />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const fullUrl = revealed[n._id];
            const list = checks[n._id];
            return (
              <li key={n._id} className="fp-card space-y-3 rounded-3xl p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                      {n.name}
                      <Chip tone={STATUS_TONE[n.status] ?? "muted"}>{t(`a2_net_status_${n.status}`)}</Chip>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
                      <span className="font-mono text-white/55">/{n.slug}</span>
                      <span>· {t("a2_net_offers", { n: n.offers })}</span>
                      <span>· {t("a2_net_conversions", { n: n.conversions })}</span>
                      {n.geo && <span>· {n.geo}</span>}
                      {n.payout_model && <span>· {n.payout_model}</span>}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {n.link_template ? <Chip tone="ok">{t("a2_net_has_template")}</Chip> : <Chip>{t("a2_net_no_template")}</Chip>}
                      {n.has_api_key ? (
                        <Chip tone="info">
                          <KeyRound className="h-3 w-3" /> {n.api_key_masked}
                        </Chip>
                      ) : (
                        <Chip>{t("a2_net_no_key")}</Chip>
                      )}
                      {n.api_url && <Chip tone="info">API</Chip>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => test(n)} disabled={busy === `test:${n._id}`} className={ghostBtn} title={t("a2_net_test")}>
                      {busy === `test:${n._id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                      {t("a2_net_test")}
                    </button>
                    <button type="button" onClick={() => edit(n)} aria-label={t("a2_edit")} className={iconBtn}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(n)} disabled={busy === `del:${n._id}`} aria-label={t("a2_delete")} className={dangerIconBtn}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white/35">{t("a2_net_postback")}</p>
                  <p className="break-all font-mono text-[11px] leading-relaxed text-emerald-200/90">
                    {fullUrl || n.postback_url_masked || t("a2_net_no_secret")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => reveal(n)} disabled={busy === `reveal:${n._id}` || !n.has_secret} className={ghostBtn}>
                      {busy === `reveal:${n._id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      {fullUrl ? t("a2_net_hide_postback") : t("a2_net_show_postback")}
                    </button>
                    {fullUrl && (
                      <button
                        type="button"
                        onClick={async () => (await copy(fullUrl)) ? toast.success(t("a2_copied")) : toast.error(t("a2_error"))}
                        className={ghostBtn}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("a2_copy")}
                      </button>
                    )}
                    <button type="button" onClick={() => regenerate(n)} disabled={busy === `regen:${n._id}`} className={ghostBtn}>
                      {busy === `regen:${n._id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {t("a2_net_regen")}
                    </button>
                  </div>
                </div>

                {(n.last_test_at || list) && (
                  <div className="text-[11px] text-white/45">
                    <p>
                      {t("a2_net_last_test")}: {formatDate(n.last_test_at)} — <span className="text-white/70">{n.last_test_result || "—"}</span>
                    </p>
                    {list && (
                      <ul className="mt-2 space-y-1">
                        {list.map((c) => (
                          <li key={c.key} className="flex items-start gap-1.5">
                            {c.ok ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                            ) : c.warn ? (
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                            ) : (
                              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                            )}
                            <span>{c.detail || c.key}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {n.notes && <p className="text-[11px] italic text-white/35">{n.notes}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
