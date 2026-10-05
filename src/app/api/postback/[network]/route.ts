import { NextResponse } from "next/server";
import { query, create, update } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/**
 * Conversion postback: /api/postback/{network}?secret=…&click_id=…&transaction_id=…&payout=…&currency=…&status=…
 * (the secret may also come in the `x-postback-secret` header).
 *
 *  - the secret must match the network's `postback_secret` (constant-time compare);
 *  - a transaction_id is processed only once per network (repeat → 200 "duplicate");
 *  - no payout → status PENDING_PRICING, nothing is invented;
 *  - secrets are never written to the logs or to the stored raw payload.
 */

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normaliseStatus(raw: string): "approved" | "rejected" | "pending" {
  const s = raw.trim().toLowerCase();
  if (["approved", "approve", "confirmed", "confirm", "1", "success", "paid", "sale", "accepted"].includes(s)) return "approved";
  if (["rejected", "reject", "declined", "decline", "-1", "2", "fraud", "cancelled", "canceled", "chargeback", "refund"].includes(s)) return "rejected";
  return "pending";
}

async function readParams(request: Request): Promise<Record<string, string>> {
  const url = new URL(request.url);
  const params: Record<string, string> = Object.fromEntries(url.searchParams.entries());
  if (request.method === "POST") {
    const type = request.headers.get("content-type") || "";
    try {
      if (type.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body || {})) if (v != null) params[k] = String(v);
      } else if (type.includes("form")) {
        const form = await request.formData();
        form.forEach((v, k) => (params[k] = String(v)));
      }
    } catch (err) {
      console.error("[postback] could not parse body:", err);
    }
  }
  return params;
}

async function handle(request: Request, context: { params: Promise<{ network: string }> }) {
  const { network: slug } = await context.params;
  try {
    const params = await readParams(request);
    const secret = request.headers.get("x-postback-secret") || params.secret || params.key || "";

    const networks = await query<any>("affiliate_network", { _filter: { slug }, _limit: 1 });
    const network = networks[0];
    if (!network || !network.postback_secret || !safeEqual(secret, network.postback_secret)) {
      console.warn(`[postback] rejected: unknown network or wrong secret (network=${slug})`);
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const clickId = (params.click_id || params.clickid || params.subid || params.aff_sub || "").trim();
    const transactionId = (params.transaction_id || params.txid || params.tid || params.conversion_id || "").trim();
    if (!transactionId) {
      return NextResponse.json({ ok: false, error: "transaction_id is required" }, { status: 400 });
    }

    // Idempotency: one transaction_id is processed only once per network.
    const duplicate = await query("conversion", {
      _filter: { transaction_id: transactionId, affiliate_network: network._id },
      _select: { _id: true },
      _limit: 1,
    });
    if (duplicate.length) {
      console.log(`[postback] duplicate transaction ${transactionId} from ${slug} — ignored`);
      return NextResponse.json({ ok: true, data: { duplicate: true } });
    }

    const rawPayout = (params.payout ?? params.amount ?? params.sum ?? "").toString().trim().replace(",", ".");
    const payout = rawPayout === "" ? NaN : Number(rawPayout);
    const hasPayout = Number.isFinite(payout);
    const status = hasPayout ? normaliseStatus(params.status || "") : "pending_pricing";

    let click: any = null;
    if (clickId) {
      const clicks = await query<any>("click", { _filter: { click_id: clickId }, _limit: 1 });
      click = clicks[0] ?? null;
      if (!click) console.warn(`[postback] click_id ${clickId} not found — conversion stored without a click`);
    }

    const { secret: _s, key: _k, ...rawSafe } = params;
    const record: Record<string, any> = {
      transaction_id: transactionId,
      click_id: clickId,
      affiliate_network: network._id,
      currency: (params.currency || "").toUpperCase().slice(0, 8),
      status,
      geo: click?.geo || "",
      category: click?.category || "",
      raw: JSON.stringify(rawSafe),
      received_at: new Date().toISOString(),
    };
    if (hasPayout) record.payout = payout;
    if (click) {
      record.click = click._id;
      const offerId = typeof click.offer === "string" ? click.offer : click.offer?._id;
      if (offerId) record.offer = offerId;
    }

    const id = await create("conversion", record);
    if (network.status !== "connected") {
      await update("affiliate_network", network._id, { status: "connected" }).catch((err) =>
        console.error("[postback] could not mark network connected:", err)
      );
    }

    console.log(
      `[postback] ${slug} tx=${transactionId} click=${clickId || "-"} status=${status} payout=${hasPayout ? payout : "none"} ${record.currency}`
    );
    return NextResponse.json({ ok: true, data: { id, status } });
  } catch (err: any) {
    console.error(`[API ERROR] postback ${slug}`, err?.message);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
