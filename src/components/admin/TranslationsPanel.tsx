"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Languages, Search, Save, Loader2, Wand2, RefreshCw, Type, LayoutGrid, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PanelHeader, Field, LangSelect, Chip, Loading, Empty, inputCls, primaryBtn, ghostBtn, errorText } from "./panelKit";

type Tab = "ui" | "offers";

/** UI strings + showcase copy translations, with manual overrides. */
export function TranslationsPanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("ui");
  return (
    <section className="mt-6 space-y-4">
      <PanelHeader icon={<Languages className="h-5 w-5" />} title={t("a2_tr_title")} subtitle={t("a2_tr_sub")} />
      <div className="flex flex-wrap gap-2">
        {(["ui", "offers"] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold transition active:scale-95",
              tab === k ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white" : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            )}
          >
            {k === "ui" ? <Type className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            {t(`a2_tr_tab_${k}`)}
          </button>
        ))}
      </div>
      {tab === "ui" ? <UiStrings /> : <OfferTranslations />}
    </section>
  );
}

// ---------------------------------------------------------------- UI strings

interface UiRow {
  key: string;
  en: string;
  value: string;
  manual: boolean;
}

type UiFilter = "all" | "missing" | "manual";
const UI_PAGE = 40;

function UiStrings() {
  const { t } = useI18n();
  const [lang, setLang] = useState("ru");
  const [rows, setRows] = useState<UiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UiFilter>("all");
  const [shown, setShown] = useState(UI_PAGE);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<{ items: UiRow[]; missing: number }>(`/api/admin/translations?lang=${lang}`);
    if (res.ok && res.data) {
      setRows(res.data.items);
      console.log(`[translations] ${lang}: ${res.data.items.length} strings, ${res.data.missing} missing`);
    } else {
      console.error("[translations] load failed:", res.error);
      toast.error(errorText(res.error, t));
    }
    setEdits({});
    setLoading(false);
  }, [lang, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setShown(UI_PAGE), [q, filter, lang]);

  const missing = rows.filter((r) => !r.value).length;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "missing" && r.value) return false;
      if (filter === "manual" && !r.manual) return false;
      if (!needle) return true;
      return r.key.toLowerCase().includes(needle) || r.en.toLowerCase().includes(needle) || r.value.toLowerCase().includes(needle);
    });
  }, [rows, q, filter]);

  const dirty = Object.keys(edits).length;

  function changeLang(next: string) {
    if (dirty && !window.confirm(t("a2_tr_discard"))) return;
    setLang(next);
  }

  async function save() {
    if (!dirty) return;
    setBusy("save");
    const res = await api.put<{ saved: number }>("/api/admin/translations", { lang, edits });
    setBusy("");
    if (!res.ok) return void toast.error(errorText(res.error, t));
    toast.success(t("a2_tr_saved", { n: res.data?.saved ?? dirty }));
    load();
  }

  async function fill() {
    setBusy("fill");
    toast.message(t("a2_tr_filling"));
    const res = await api.post<{ pending: number }>("/api/admin/translations", { lang });
    setBusy("");
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    toast.success(res.data.pending ? t("a2_tr_fill_partial", { n: res.data.pending }) : t("a2_tr_fill_done"));
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <LangSelect value={lang} onChange={changeLang} exclude={["en"]} className="sm:w-60" ariaLabel={t("a2_language")} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a2_search")} className={inputCls + " rounded-full pl-10"} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "missing", "manual"] as UiFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
              filter === f ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white" : "border-white/10 bg-white/5 text-white/50"
            )}
          >
            {t(`a2_tr_filter_${f}`)}
            {f === "missing" && ` (${missing})`}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" onClick={fill} disabled={busy !== "" || loading} className={ghostBtn}>
            {busy === "fill" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {t("a2_tr_fill")}
          </button>
          <button type="button" onClick={save} disabled={!dirty || busy !== ""} className={primaryBtn + " px-4 py-2 text-xs"}>
            {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t("a2_tr_save_n", { n: dirty })}
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty text={t("a2_empty")} />
      ) : (
        <ul className="space-y-2">
          {filtered.slice(0, shown).map((r) => {
            const value = edits[r.key] ?? r.value;
            const changed = r.key in edits;
            return (
              <li key={r.key} className={cn("fp-card space-y-1.5 rounded-2xl p-3", changed && "ring-1 ring-fuchsia-400/40")}>
                <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-white/35">
                  <span className="font-mono">{r.key}</span>
                  {r.manual && <Chip tone="info">{t("a2_tr_manual")}</Chip>}
                  {!r.value && <Chip tone="warn">{t("a2_tr_missing")}</Chip>}
                </p>
                <p className="text-xs text-white/55">{r.en}</p>
                <input
                  value={value}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEdits((prev) => {
                      const next = { ...prev };
                      if (v === r.value) delete next[r.key];
                      else next[r.key] = v;
                      return next;
                    });
                  }}
                  className={inputCls + " py-2"}
                  placeholder={t("a2_translation_empty")}
                />
              </li>
            );
          })}
        </ul>
      )}
      {!loading && filtered.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + UI_PAGE)} className={ghostBtn + " mx-auto flex px-6 py-2.5 text-sm"}>
          {t("a2_load_more")} ({filtered.length - shown})
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- showcase translations

interface OfferRef {
  _id: string;
  name: string;
  status: string;
}

interface OfferView {
  offer: { _id: string; name: string; description: string; tags: string };
  source_lang: string;
  lang: string;
  translation: { description: string; tags: string; is_manual: boolean; stale: boolean } | null;
}

function OfferTranslations() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [offers, setOffers] = useState<OfferRef[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OfferRef | null>(null);
  const [lang, setLang] = useState("en");
  const [view, setView] = useState<OfferView | null>(null);
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState("");

  const search = useCallback(
    async (offset: number) => {
      const res = await api.get<{ items: OfferRef[]; hasMore: boolean }>(
        `/api/admin/translations/offers?q=${encodeURIComponent(q.trim())}&offset=${offset}&limit=40`
      );
      if (!res.ok || !res.data) {
        console.error("[translations] offers failed:", res.error);
        toast.error(errorText(res.error, t));
        return null;
      }
      return res.data;
    },
    [q, t]
  );

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const data = await search(0);
      if (data) {
        setOffers(data.items);
        setHasMore(data.hasMore);
      }
      setLoading(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const open = useCallback(
    async (offerId: string, language: string) => {
      setBusy("open");
      const res = await api.get<OfferView>(`/api/admin/translations/offers/${offerId}?lang=${language}`);
      setBusy("");
      if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
      setView(res.data);
      setDesc(res.data.translation?.description ?? "");
      setTags(res.data.translation?.tags ?? "");
    },
    [t]
  );

  useEffect(() => {
    if (selected) open(selected._id, lang);
  }, [selected, lang, open]);

  async function save() {
    if (!selected) return;
    setBusy("save");
    const res = await api.put<OfferView>(`/api/admin/translations/offers/${selected._id}`, { lang, description: desc, tags });
    setBusy("");
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    setView(res.data);
    toast.success(t("a2_tr_offer_saved"));
  }

  async function retranslate(all: boolean) {
    if (!selected) return;
    if (all && !window.confirm(t("a2_tr_retranslate_all_confirm"))) return;
    setBusy(all ? "all" : "one");
    const res = await api.post<OfferView | { queued: boolean }>(`/api/admin/translations/offers/${selected._id}`, { lang, all });
    setBusy("");
    if (!res.ok || !res.data) return void toast.error(errorText(res.error, t));
    if ("offer" in res.data) {
      setView(res.data);
      setDesc(res.data.translation?.description ?? "");
      setTags(res.data.translation?.tags ?? "");
    }
    toast.success(all ? t("a2_tr_retranslate_all_done") : t("a2_tr_retranslate_done"));
  }

  if (selected) {
    const tr = view?.translation;
    const dirty = (tr?.description ?? "") !== desc || (tr?.tags ?? "") !== tags;
    return (
      <div className="fp-card space-y-4 rounded-3xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { setSelected(null); setView(null); }} className={ghostBtn}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("a2_back")}
          </button>
          <h3 className="min-w-0 flex-1 truncate font-display text-sm font-extrabold text-white">{selected.name}</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <LangSelect value={lang} onChange={setLang} exclude={[view?.source_lang ?? "ru"]} className="sm:w-60" ariaLabel={t("a2_language")} />
          <div className="flex flex-wrap gap-1.5">
            {busy === "open" ? (
              <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" />
            ) : !tr ? (
              <Chip tone="warn">{t("a2_tr_missing")}</Chip>
            ) : tr.is_manual ? (
              <Chip tone="info">{t("a2_tr_manual")}</Chip>
            ) : tr.stale ? (
              <Chip tone="warn">{t("a2_tr_stale")}</Chip>
            ) : (
              <Chip tone="ok">{t("a2_tr_auto")}</Chip>
            )}
          </div>
        </div>

        {view && (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-white/35">
                {t("a2_tr_original", { lang: view.source_lang.toUpperCase() })}
              </p>
              <p className="whitespace-pre-line text-xs text-white/60">{view.offer.description || "—"}</p>
              {view.offer.tags && <p className="mt-1.5 text-[11px] text-white/40">#{view.offer.tags}</p>}
            </div>
            <Field label={t("a2_tr_description")}>
              <textarea value={desc} rows={5} dir={lang === "ar" ? "rtl" : "ltr"} onChange={(e) => setDesc(e.target.value)} className={inputCls + " resize-y"} />
            </Field>
            <Field label={t("a2_tr_tags")} hint={t("a2_tr_manual_hint")}>
              <input value={tags} dir={lang === "ar" ? "rtl" : "ltr"} onChange={(e) => setTags(e.target.value)} className={inputCls} />
            </Field>
            <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
              <button type="button" onClick={save} disabled={busy !== "" || !dirty} className={primaryBtn}>
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("a2_save")}
              </button>
              <button type="button" onClick={() => retranslate(false)} disabled={busy !== ""} className={ghostBtn + " px-4 py-2.5"}>
                {busy === "one" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {t("a2_tr_retranslate_one")}
              </button>
              <button type="button" onClick={() => retranslate(true)} disabled={busy !== ""} className={ghostBtn + " px-4 py-2.5"}>
                {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                {t("a2_tr_retranslate_all")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("a2_tr_search_offer")} className={inputCls + " rounded-full pl-10"} />
      </div>
      {loading ? (
        <Loading />
      ) : offers.length === 0 ? (
        <Empty text={t("a2_empty")} />
      ) : (
        <ul className="space-y-2">
          {offers.map((o) => (
            <li key={o._id}>
              <button
                type="button"
                onClick={() => setSelected(o)}
                className="fp-card flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:ring-1 hover:ring-fuchsia-400/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{o.name}</span>
                {o.status && o.status !== "active" && <Chip>{o.status}</Chip>}
                <Languages className="h-4 w-4 shrink-0 text-white/35" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasMore && !loading && (
        <button
          type="button"
          disabled={busy === "more"}
          onClick={async () => {
            setBusy("more");
            const data = await search(offers.length);
            setBusy("");
            if (data) {
              setOffers((prev) => [...prev, ...data.items]);
              setHasMore(data.hasMore);
            }
          }}
          className={ghostBtn + " mx-auto flex px-6 py-2.5 text-sm"}
        >
          {busy === "more" && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("a2_load_more")}
        </button>
      )}
    </div>
  );
}
