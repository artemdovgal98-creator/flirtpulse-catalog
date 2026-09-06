"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, Save, X, Search, Loader2, ImagePlus, Link2, Link2Off, Eye, EyeOff, Star,
  Image as ImageIcon, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  CATEGORIES, CATEGORY_DOT, GEO_CODES, GEO_FLAGS, GEO_NAMES,
  offerImages, type AdminOffer,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const PAGE_SIZE = 30;

/** Which slice of the catalog the list shows. */
type Scope = "all" | "custom" | "edited";

interface FormState {
  _id?: string;
  name: string;
  description: string;
  category: string[];
  geo: string[];
  tags: string;
  offer_url: string;
  status: string;
  is_featured: string;
  images: Array<{ name: string; url: string }>;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  category: ["useful"],
  geo: ["worldwide"],
  tags: "",
  offer_url: "",
  status: "active",
  is_featured: "no",
  images: [],
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface ListResponse {
  items: AdminOffer[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Full CRUD for every showcase in the catalog — the seeded cards included.
 * The admin can attach a tracking link, upload up to 3 photos and save; the
 * catalog then redirects clicks through `/go/{id}` to that link.
 */
export function ShowcaseManager() {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [category, setCategory] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const buildParams = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (scope === "custom") params.set("custom", "1");
      if (scope === "edited") params.set("edited", "1");
      if (category) params.set("category", category);
      params.set("offset", String(offset));
      params.set("limit", String(PAGE_SIZE));
      return params;
    },
    [query, scope, category]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.get<ListResponse>(`/api/admin/showcases?${buildParams(0)}`);
    if (res.ok && res.data) {
      setItems(res.data.items);
      setTotal(res.data.total);
      setHasMore(res.data.hasMore);
      console.log(`[admin] loaded ${res.data.items.length} of ${res.data.total} showcases`);
    } else {
      console.error("[admin] showcase list failed:", res.error);
      toast.error(String(res.error ?? "Error"));
    }
    setLoading(false);
  }, [buildParams]);

  useEffect(() => {
    const timer = window.setTimeout(load, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function loadMore() {
    setLoadingMore(true);
    const res = await api.get<ListResponse>(`/api/admin/showcases?${buildParams(items.length)}`);
    setLoadingMore(false);
    if (!res.ok || !res.data) {
      console.error("[admin] load more failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    setItems((prev) => [...prev, ...res.data!.items]);
    setTotal(res.data.total);
    setHasMore(res.data.hasMore);
    console.log(`[admin] loaded ${res.data.items.length} more showcases`);
  }

  function startCreate() {
    setForm({ ...EMPTY });
    console.log("[admin] new showcase form opened");
  }

  function startEdit(item: AdminOffer) {
    setForm({
      _id: item._id,
      name: item.name ?? "",
      description: item.description ?? "",
      category: item.category ?? [],
      geo: item.geo ?? [],
      tags: item.tags ?? "",
      offer_url: item.offer_url ?? "",
      status: item.status ?? "active",
      is_featured: item.is_featured ?? "no",
      images: (item.images ?? []).map((f) => ({ name: f.name, url: f.url })),
    });
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!form || !picked.length) return;

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

    const res = await api.upload<{ files: Array<{ name: string; url: string }> }>(
      "/api/admin/upload",
      payload
    );
    setUploading(false);

    if (!res.ok || !res.data) {
      console.error("[admin] upload failed:", res.error);
      toast.error(String(res.error ?? "Upload failed"));
      return;
    }
    setForm((prev) => (prev ? { ...prev, images: [...prev.images, ...res.data!.files] } : prev));
    console.log(`[admin] uploaded ${res.data.files.length} image(s)`);
  }

  async function save() {
    if (!form) return;
    if (!form.name.trim() || !form.category.length) {
      toast.error(t("admin_required"));
      return;
    }

    setSaving(true);
    const body = {
      name: form.name,
      description: form.description,
      category: form.category,
      geo: form.geo,
      tags: form.tags,
      offer_url: form.offer_url,
      status: form.status,
      is_featured: form.is_featured,
      images: form.images.map((f) => ({ name: f.name })),
    };

    const res = form._id
      ? await api.put<{ item: AdminOffer }>(`/api/admin/showcases/${form._id}`, body)
      : await api.post<{ item: AdminOffer }>("/api/admin/showcases", body);
    setSaving(false);

    if (!res.ok) {
      console.error("[admin] save failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    toast.success(form._id ? t("admin_updated") : t("admin_created"));
    console.log(`[admin] showcase saved: ${form.name} link=${form.offer_url || "-"}`);

    const saved = (res.data as { item?: AdminOffer } | undefined)?.item;
    if (form._id && saved) {
      // Patch the row in place so the current page (and scroll position) survives.
      setItems((prev) => prev.map((it) => (it._id === form._id ? { ...it, ...saved } : it)));
      setForm(null);
      return;
    }
    setForm(null);
    load();
  }

  async function remove(item: AdminOffer) {
    if (!window.confirm(`${t("admin_confirm_delete")}\n\n${item.name}`)) return;
    const res = await api.delete(`/api/admin/showcases/${item._id}`);
    if (!res.ok) {
      console.error("[admin] delete failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    toast.success(t("admin_deleted"));
    console.log(`[admin] showcase deleted: ${item.name}`);
    load();
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg font-extrabold text-white">{t("admin_manage")}</h2>
        <button
          type="button"
          onClick={startCreate}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-[0_10px_28px_-12px_rgba(217,70,239,0.95)] transition hover:brightness-110 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {t("admin_add")}
        </button>
      </div>

      {/* Editor */}
      {form && (
        <div className="fp-card fp-rise space-y-4 rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-extrabold text-white">
              {form._id ? t("admin_edit") : t("admin_add")}
            </h3>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
              aria-label={t("admin_cancel")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              {t("admin_field_title")}
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60"
              placeholder="FlirtPulse Premium"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              {t("admin_field_desc")}
            </span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              {t("admin_field_category")}
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = form.category.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: toggle(form.category, c) })}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition active:scale-95",
                      active
                        ? "border-fuchsia-400/60 bg-gradient-to-r from-fuchsia-500/25 to-indigo-500/25 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT[c])} />
                    {t(`cat_${c}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              {t("admin_field_countries")}
            </span>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-2.5">
              {GEO_CODES.map((g) => {
                const active = form.geo.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    title={GEO_NAMES[g]}
                    onClick={() => setForm({ ...form, geo: toggle(form.geo, g) })}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold uppercase transition",
                      active
                        ? "bg-fuchsia-500/25 text-white ring-1 ring-inset ring-fuchsia-400/50"
                        : "bg-white/5 text-white/45 hover:text-white"
                    )}
                  >
                    <span className="text-[12px] leading-none">{GEO_FLAGS[g] ?? "🏳️"}</span>
                    {g === "worldwide" ? "WW" : g}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              <Link2 className="h-3 w-3" />
              {t("admin_field_link")}
            </span>
            <input
              value={form.offer_url}
              onChange={(e) => setForm({ ...form, offer_url: e.target.value })}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 font-mono text-xs text-emerald-200 outline-none transition placeholder:text-white/25 focus:border-emerald-400/60"
              placeholder="https://track.example.com/?aff=123"
            />
            <span className="mt-1.5 block text-[11px] leading-relaxed text-white/30">
              {t("admin_link_hint")}
            </span>
          </label>

          <div>
            <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-widest text-white/40">
              {t("admin_field_images")}
            </span>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div
                  key={img.name}
                  className="group relative h-20 w-28 overflow-hidden rounded-2xl border border-white/10"
                >
                  <img src={img.url} alt={`${form.name} ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label={t("admin_delete")}
                    onClick={() =>
                      setForm({ ...form, images: form.images.filter((f) => f.name !== img.name) })
                    }
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition group-hover:opacity-100 hover:text-rose-300"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {form.images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="inline-flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-white/45 transition hover:border-fuchsia-400/50 hover:text-white disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] font-bold">{form.images.length}/{MAX_IMAGES}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              multiple
              hidden
              onChange={handleFiles}
            />
            <span className="mt-1.5 block text-[11px] text-white/30">{t("admin_images_hint")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, status: form.status === "active" ? "hidden" : "active" })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                form.status === "active"
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-white/45"
              )}
            >
              {form.status === "active" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {form.status === "active" ? t("admin_visible") : t("admin_hidden")}
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, is_featured: form.is_featured === "yes" ? "no" : "yes" })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition",
                form.is_featured === "yes"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/5 text-white/45"
              )}
            >
              <Star className={cn("h-3.5 w-3.5", form.is_featured === "yes" && "fill-current")} />
              {t("featured")}
            </button>

            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="tag1,tag2"
              className="min-w-32 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60"
            />
          </div>

          <div className="flex gap-2 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={save}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("admin_saving") : t("admin_save")}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/70 transition hover:text-white active:scale-95"
            >
              {t("admin_cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin_search")}
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/60"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-9 text-xs font-bold text-white outline-none transition focus:border-fuchsia-400/60"
          >
            <option value="" className="bg-[#140f24]">{t("admin_all_categories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#140f24]">
                {t(`cat_${c}`)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "custom", "edited"] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-bold transition active:scale-95",
              scope === s
                ? "border-fuchsia-400/60 bg-fuchsia-500/15 text-white"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white"
            )}
          >
            {t(`admin_scope_${s}`)}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-[11px] font-bold text-white/35">
            {items.length} {t("admin_of")} {total}
          </span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="fp-card flex h-28 items-center justify-center rounded-3xl">
          <Loader2 className="h-5 w-5 animate-spin text-fuchsia-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="fp-card rounded-3xl p-8 text-center text-sm text-white/35">{t("admin_empty")}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const cover = offerImages(item)[0];
            return (
              <li key={item._id} className="fp-card flex items-center gap-3 rounded-2xl p-3">
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {cover && <img src={cover} alt={item.name} className="h-full w-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{item.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-white/40">
                    {(item.category ?? []).map((c) => (
                      <span key={c} className="inline-flex items-center gap-1">
                        <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT[c])} />
                        {t(`cat_${c}`)}
                      </span>
                    ))}
                    <span>· {item.click_count ?? 0} {t("admin_clicks_short")}</span>
                    {item.status !== "active" && (
                      <span className="text-amber-300/70">· {t("admin_hidden")}</span>
                    )}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    {item.offer_url ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-200">
                        <Link2 className="h-3 w-3" />
                        {t("admin_has_link")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/35">
                        <Link2Off className="h-3 w-3" />
                        {t("admin_no_link")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/40">
                      <ImageIcon className="h-3 w-3" />
                      {(item.images ?? []).length}/{MAX_IMAGES} {t("admin_photos")}
                    </span>
                    {item.admin_edited === "yes" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-200">
                        {t("admin_scope_edited")}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  aria-label={t("admin_edit")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-fuchsia-400/40 hover:text-white active:scale-90"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={t("admin_delete")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 active:scale-90"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && !loading && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-white/75 transition hover:border-fuchsia-400/40 hover:text-white active:scale-95 disabled:opacity-60"
        >
          {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_load_more")}
        </button>
      )}
    </section>
  );
}
