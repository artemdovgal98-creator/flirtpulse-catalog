"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Eraser, Save, Send, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Btn, Card, Hint, Label, PanelTitle, Select, Spinner, Toggle, fmtDate, inputCls } from "@/components/admin/adminKit";

interface Settings {
  telegram_channel_url: string;
  telegram_chat_id: string;
  telegram_autopost: string;
  catalog_ad_every: string;
  push_enabled: string;
  telegram_bot_token: string;
  telegram_bot_token_set: boolean;
  can_manage: boolean;
  role: string | null;
}

interface RoleRow {
  _id: string;
  email: string;
  role: string;
  user: string;
  granted_at?: string;
}

const RESET_WORD = "СБРОСИТЬ";

/** Settings: Telegram, catalog ads cadence, push, admin roles and the statistics reset. */
export function SettingsPanel() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [granting, setGranting] = useState(false);

  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetWord, setResetWord] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      api.get<Settings>("/api/admin/settings"),
      api.get<{ items: RoleRow[] }>("/api/admin/roles"),
    ]);
    if (s.ok && s.data) setSettings(s.data);
    else {
      console.error("[settings] load failed:", s.error);
      toast.error(String(s.error ?? "Error"));
    }
    if (r.ok && r.data) setRoles(r.data.items);
    else console.error("[settings] roles failed:", r.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!settings) return <Spinner />;
  const canManage = settings.can_manage;
  const set = (k: keyof Settings, v: string) => setSettings({ ...settings, [k]: v });

  async function save() {
    if (!settings) return;
    setSaving(true);
    const body: Record<string, any> = {
      telegram_channel_url: settings.telegram_channel_url,
      telegram_chat_id: settings.telegram_chat_id,
      telegram_autopost: settings.telegram_autopost,
      catalog_ad_every: settings.catalog_ad_every,
      push_enabled: settings.push_enabled,
    };
    if (token.trim()) body.telegram_bot_token = token.trim();
    const res = await api.put<{ changed: string[] }>("/api/admin/settings", body);
    setSaving(false);
    if (!res.ok) {
      console.error("[settings] save failed:", res.error);
      toast.error(res.error === "ADMIN_ROLE_REQUIRED" ? t("ap_admin_role_required") : String(res.error ?? "Error"));
      return;
    }
    setToken("");
    toast.success(t("ap_settings_saved"));
    console.log("[settings] saved:", res.data?.changed);
    load();
  }

  async function clearToken() {
    if (!window.confirm(t("ap_token_clear_confirm"))) return;
    const res = await api.put("/api/admin/settings", { telegram_bot_token_clear: true });
    if (!res.ok) {
      toast.error(String(res.error ?? "Error"));
      return;
    }
    toast.success(t("ap_settings_saved"));
    load();
  }

  async function testTelegram() {
    setTesting(true);
    const res = await api.post("/api/admin/settings/telegram-test", {});
    setTesting(false);
    if (!res.ok) {
      console.error("[settings] telegram test failed:", res.error);
      toast.error(`${t("ap_tg_test_failed")}: ${String(res.error ?? "")}`);
      return;
    }
    toast.success(t("ap_tg_test_ok"));
  }

  async function grant() {
    setGranting(true);
    const res = await api.post("/api/admin/roles", { email: newEmail, role: newRole });
    setGranting(false);
    if (!res.ok) {
      const code = String(res.error ?? "");
      const map: Record<string, string> = {
        USER_NOT_FOUND: t("ap_role_user_not_found"),
        INVALID_EMAIL: t("ap_role_invalid_email"),
        ADMIN_ROLE_REQUIRED: t("ap_admin_role_required"),
      };
      toast.error(map[code] ?? code);
      return;
    }
    setNewEmail("");
    toast.success(t("ap_role_saved"));
    load();
  }

  async function changeRole(row: RoleRow, role: string) {
    const res = await api.put(`/api/admin/roles/${row._id}`, { role });
    if (!res.ok) {
      const code = String(res.error ?? "");
      toast.error(code === "CANNOT_DEMOTE_SELF" ? t("ap_role_self") : code);
      return;
    }
    toast.success(t("ap_role_saved"));
    load();
  }

  async function doReset() {
    if (resetWord.trim().toUpperCase() !== RESET_WORD) return;
    setResetting(true);
    const res = await api.post<{ clicks: number; sessions: number; offers: number }>("/api/admin/stats/reset", {
      confirm: resetWord.trim(),
    });
    setResetting(false);
    if (!res.ok) {
      console.error("[settings] reset failed:", res.error);
      toast.error(String(res.error ?? "Error"));
      return;
    }
    console.log("[settings] statistics reset:", res.data);
    toast.success(t("admin_reset_done"));
    setResetStep(0);
    setResetWord("");
  }

  return (
    <section className="space-y-4">
      <PanelTitle title={t("ap_tab_settings")} />
      {!canManage && <Hint>{t("ap_admin_role_required")}</Hint>}

      {/* Telegram */}
      <Card className="space-y-3">
        <h3 className="font-display text-sm font-extrabold text-white">Telegram</h3>
        <label className="block">
          <Label>{t("ap_tg_channel")}</Label>
          <input
            value={settings.telegram_channel_url}
            onChange={(e) => set("telegram_channel_url", e.target.value)}
            className={inputCls}
            placeholder="https://t.me/flirtpulse"
          />
          <Hint>{t("ap_tg_channel_hint")}</Hint>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Label>{t("ap_tg_token")}</Label>
            <input
              type="password"
              value={token}
              autoComplete="off"
              onChange={(e) => setToken(e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder={settings.telegram_bot_token_set ? settings.telegram_bot_token : "123456:ABC…"}
            />
            <Hint>
              {settings.telegram_bot_token_set ? t("ap_tg_token_set") : t("ap_tg_token_hint")}
              {settings.telegram_bot_token_set && canManage && (
                <button type="button" onClick={clearToken} className="ml-2 font-bold text-rose-300 hover:underline">
                  {t("ap_tg_token_clear")}
                </button>
              )}
            </Hint>
          </label>
          <label className="block">
            <Label>{t("ap_tg_chat")}</Label>
            <input
              value={settings.telegram_chat_id}
              onChange={(e) => set("telegram_chat_id", e.target.value)}
              className={`${inputCls} font-mono`}
              placeholder="@flirtpulse / -100123456789"
            />
          </label>
        </div>
        <Toggle
          checked={settings.telegram_autopost === "yes"}
          onChange={(v) => set("telegram_autopost", v ? "yes" : "no")}
          label={t("ap_tg_autopost")}
        />
        <Btn onClick={testTelegram} loading={testing} icon={<Send className="h-3.5 w-3.5" />}>
          {t("ap_tg_test")}
        </Btn>
      </Card>

      {/* Catalog & push */}
      <Card className="space-y-3">
        <h3 className="font-display text-sm font-extrabold text-white">{t("ap_catalog_settings")}</h3>
        <label className="block">
          <Label>{t("ap_ad_every")}</Label>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.catalog_ad_every}
            onChange={(e) => set("catalog_ad_every", e.target.value)}
            className={inputCls}
            placeholder="8"
          />
          <Hint>{t("ap_ad_every_hint")}</Hint>
        </label>
        <Toggle
          checked={settings.push_enabled === "yes"}
          onChange={(v) => set("push_enabled", v ? "yes" : "no")}
          label={t("ap_push_enabled")}
        />
      </Card>

      {canManage && (
        <Btn variant="primary" onClick={save} loading={saving} icon={<Save className="h-4 w-4" />} className="px-5 py-2.5 text-sm">
          {t("admin_save")}
        </Btn>
      )}

      {/* Roles */}
      <Card className="space-y-3">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-extrabold text-white">
          <ShieldCheck className="h-4 w-4 text-fuchsia-300" />
          {t("ap_roles")}
        </h3>
        <Hint>{t("ap_roles_hint")}</Hint>
        {canManage && (
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className={inputCls}
            />
            <Select value={newRole} onChange={setNewRole} ariaLabel={t("ap_role")}>
              <option value="admin">{t("ap_role_admin")}</option>
              <option value="editor">{t("ap_role_editor")}</option>
            </Select>
            <Btn variant="primary" onClick={grant} loading={granting} disabled={!newEmail.trim()} icon={<UserPlus className="h-4 w-4" />}>
              {t("ap_role_add")}
            </Btn>
          </div>
        )}
        {!roles.length ? (
          <p className="text-sm text-white/35">{t("ap_roles_empty")}</p>
        ) : (
          <ul className="space-y-1.5">
            {roles.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white/85">{r.email || r.user}</span>
                  <span className="block text-[10px] text-white/30">{fmtDate(r.granted_at)}</span>
                </span>
                {canManage ? (
                  <Select value={r.role} onChange={(v) => changeRole(r, v)} className="w-36" ariaLabel={t("ap_role")}>
                    <option value="admin">{t("ap_role_admin")}</option>
                    <option value="editor">{t("ap_role_editor")}</option>
                    <option value="none">{t("ap_role_none")}</option>
                  </Select>
                ) : (
                  <span className="text-xs font-bold text-white/60">{t(`ap_role_${r.role}`)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Danger zone */}
      {canManage && (
        <Card className="space-y-3 border-rose-400/25 bg-rose-500/[0.04]">
          <h3 className="flex items-center gap-1.5 font-display text-sm font-extrabold text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            {t("ap_danger_zone")}
          </h3>
          <p className="text-xs text-white/50">{t("ap_reset_desc")}</p>
          {resetStep === 0 && (
            <Btn variant="danger" onClick={() => setResetStep(1)} icon={<Eraser className="h-3.5 w-3.5" />}>
              {t("admin_reset")}
            </Btn>
          )}
          {resetStep === 1 && (
            <div className="space-y-2 rounded-2xl border border-rose-400/30 bg-black/20 p-3">
              <p className="text-sm font-bold text-rose-100">{t("admin_reset_confirm")}</p>
              <div className="flex flex-wrap gap-2">
                <Btn variant="danger" onClick={() => setResetStep(2)}>
                  {t("ap_reset_continue")}
                </Btn>
                <Btn onClick={() => setResetStep(0)}>{t("admin_cancel")}</Btn>
              </div>
            </div>
          )}
          {resetStep === 2 && (
            <div className="space-y-2 rounded-2xl border border-rose-400/40 bg-black/30 p-3">
              <p className="text-sm font-bold text-rose-100">{t("ap_reset_type", { word: RESET_WORD })}</p>
              <input
                value={resetWord}
                autoFocus
                onChange={(e) => setResetWord(e.target.value)}
                className={`${inputCls} border-rose-400/40 font-mono uppercase`}
                placeholder={RESET_WORD}
              />
              <div className="flex flex-wrap gap-2">
                <Btn
                  variant="danger"
                  onClick={doReset}
                  loading={resetting}
                  disabled={resetWord.trim().toUpperCase() !== RESET_WORD}
                  icon={<Eraser className="h-3.5 w-3.5" />}
                >
                  {t("ap_reset_final")}
                </Btn>
                <Btn
                  onClick={() => {
                    setResetStep(0);
                    setResetWord("");
                  }}
                >
                  {t("admin_cancel")}
                </Btn>
              </div>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
