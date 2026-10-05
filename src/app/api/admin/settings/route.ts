import { NextResponse } from "next/server";
import { getAdminGuard, forbidden, logAdmin } from "@/lib/admin";
import { getSettings, setSetting } from "@/lib/server/settings";
import { mask } from "@/lib/server/db";
import { canManage, managerOnly } from "@/lib/server/admin-showcases";

export const dynamic = "force-dynamic";

const PLAIN_KEYS = ["telegram_channel_url", "telegram_chat_id", "telegram_autopost", "catalog_ad_every", "push_enabled"] as const;
const SECRET_KEYS = ["telegram_bot_token"] as const;

/** Admin settings. Secrets are only ever returned masked (last 4 characters). */
export async function GET() {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    const all = await getSettings();
    const data: Record<string, any> = {};
    for (const k of PLAIN_KEYS) data[k] = all[k] ?? "";
    for (const k of SECRET_KEYS) {
      data[k] = mask(all[k]);
      data[`${k}_set`] = Boolean(all[k]);
    }
    data.can_manage = canManage(guard);
    data.role = guard.role;
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[API ERROR] GET /api/admin/settings", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

/**
 * Saves the settings sent in the body (partial). The bot token is write-only:
 * an empty value or the masked placeholder keeps the stored token; send
 * `telegram_bot_token_clear: true` to remove it.
 */
export async function PUT(request: Request) {
  try {
    const guard = await getAdminGuard();
    if (!guard.isAdmin) return forbidden();
    if (!canManage(guard)) return managerOnly();

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const changed: string[] = [];

    for (const k of PLAIN_KEYS) {
      if (!(k in body)) continue;
      let value = String(body[k] ?? "").trim();
      if (k === "telegram_autopost" || k === "push_enabled") value = value === "yes" || body[k] === true ? "yes" : "no";
      if (k === "catalog_ad_every") {
        const n = Math.round(Number(value));
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return NextResponse.json({ ok: false, error: "catalog_ad_every must be 0–100" }, { status: 400 });
        }
        value = String(n);
      }
      if (k === "telegram_channel_url" && value && !/^https?:\/\//i.test(value)) {
        if (/^@?[a-z0-9_]{4,}$/i.test(value)) value = `https://t.me/${value.replace(/^@/, "")}`;
        else return NextResponse.json({ ok: false, error: "Telegram channel must be a https:// link or @name" }, { status: 400 });
      }
      await setSetting(k, value);
      changed.push(k);
    }

    if (body.telegram_bot_token_clear === true) {
      await setSetting("telegram_bot_token", "");
      changed.push("telegram_bot_token");
    } else if (typeof body.telegram_bot_token === "string") {
      const token = body.telegram_bot_token.trim();
      if (token && !token.includes("•")) {
        if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
          return NextResponse.json({ ok: false, error: "This does not look like a Telegram bot token" }, { status: 400 });
        }
        await setSetting("telegram_bot_token", token);
        changed.push("telegram_bot_token");
      }
    }

    // Values are never written to the journal (the token is secret).
    await logAdmin(guard, "settings", "app_setting", changed.join(",") || "-", `Settings saved: ${changed.join(", ") || "nothing changed"}`);
    console.log(`[API /admin/settings] saved: ${changed.join(", ") || "-"}`);
    return NextResponse.json({ ok: true, data: { changed } });
  } catch (err: any) {
    console.error("[API ERROR] PUT /api/admin/settings", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
