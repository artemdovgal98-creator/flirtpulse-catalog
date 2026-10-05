import "server-only";
import { query, create, update } from "@/lib/server/db";
import { translateToAll } from "@/lib/server/translate";
import { getSetting } from "@/lib/server/settings";
import { pushToSubscribers } from "@/lib/server/webpush";
import { sendTelegram, escapeHtml } from "@/lib/server/telegram";

/**
 * Side effects of a showcase being published for the first time:
 *  1. a ticker line "New showcase: …" (translated),
 *  2. a bell notification for the subscribers of its category (translated),
 *  3. an opt-in web push to those subscribers,
 *  4. optional autopost to the Telegram channel.
 * Runs once per showcase — re-publishing an archived card does not spam.
 */
export async function announceShowcase(offer: any, origin: string): Promise<void> {
  if (!offer?._id) return;
  const existing = await query("notification", { _filter: { offer: offer._id, type: "new_showcase" }, _limit: 1 });
  if (existing.length) {
    console.log(`[announce] ${offer._id} was already announced — skipping`);
    return;
  }

  const name = offer.short_name || offer.name;
  const category = (offer.category || [])[0] || "";
  const link = `/offer/${offer._id}`;
  const now = new Date().toISOString();
  const tickerText = `🆕 ${name}`;
  const body = String(offer.description || "").slice(0, 160);

  const [tickerTr, bodyTr] = await Promise.all([translateToAll(tickerText), translateToAll(body)]);

  await create("ticker_item", {
    text: tickerText,
    link,
    kind: "new_showcase",
    starts_at: now,
    ends_at: new Date(Date.now() + 14 * 86400_000).toISOString(),
    is_enabled: "yes",
    offer: offer._id,
    translations: JSON.stringify(tickerTr),
  });

  const notificationId = await create("notification", {
    title: name,
    body,
    link,
    type: "new_showcase",
    category,
    offer: offer._id,
    is_enabled: "yes",
    published_at: now,
    translations: JSON.stringify({ title: {}, body: bodyTr }),
    push_sent: 0,
  });
  console.log(`[announce] ticker + notification created for "${name}" (category ${category || "-"})`);

  try {
    const sent = await pushToSubscribers(category || undefined);
    await update("notification", notificationId, { push_sent: sent });
  } catch (err) {
    console.error("[announce] web push failed:", err);
  }

  if ((await getSetting("telegram_autopost")) === "yes") {
    const url = `${origin}${link}`;
    const text = `🆕 <b>${escapeHtml(name)}</b>\n${escapeHtml(body)}\n\n${url}`;
    const res = await sendTelegram(text);
    if (!res.ok) console.error("[announce] telegram autopost failed:", res.error);
  }
}
