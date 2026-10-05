import "server-only";
import { getSetting } from "@/lib/server/settings";

/**
 * Telegram Bot API. The bot token lives only in `app_setting.telegram_bot_token`
 * and is never sent to the browser or written to logs.
 */
export async function sendTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const [token, chatId] = await Promise.all([getSetting("telegram_bot_token"), getSetting("telegram_chat_id")]);
  if (!token || !chatId) return { ok: false, error: "Telegram bot token or chat id is not configured" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!json.ok) {
      console.error("[telegram] sendMessage rejected:", json.description || res.status);
      return { ok: false, error: json.description || `HTTP ${res.status}` };
    }
    console.log("[telegram] message posted to the channel");
    return { ok: true };
  } catch (err: any) {
    console.error("[telegram] request failed:", err?.message);
    return { ok: false, error: err?.message || "Request failed" };
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
