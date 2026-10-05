import "server-only";
import { getSetting, setSetting } from "@/lib/server/settings";
import { query, update } from "@/lib/server/db";

/**
 * Minimal Web Push sender built on Web Crypto (works on Node and Workers).
 *
 * Pushes carry NO payload — so no message encryption is needed. The service
 * worker receives the "tickle", fetches /api/notifications for its language and
 * shows the newest one. VAPID keys are generated once and stored in
 * `app_setting` (the private key never leaves the server).
 */

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

interface VapidKeys {
  publicKey: string; // base64url uncompressed P-256 point (applicationServerKey)
  privateJwk: JsonWebKey;
}

let memo: VapidKeys | null = null;

export async function getVapidKeys(): Promise<VapidKeys> {
  if (memo) return memo;
  const [pub, priv] = await Promise.all([getSetting("vapid_public_key"), getSetting("vapid_private_jwk")]);
  if (pub && priv) {
    memo = { publicKey: pub, privateJwk: JSON.parse(priv) };
    return memo;
  }
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const rawPub = await crypto.subtle.exportKey("raw", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const publicKey = b64url(rawPub);
  await setSetting("vapid_public_key", publicKey);
  await setSetting("vapid_private_jwk", JSON.stringify(privateJwk));
  console.log("[webpush] generated a new VAPID key pair");
  memo = { publicKey, privateJwk };
  return memo;
}

async function vapidHeader(endpoint: string): Promise<string> {
  const { publicKey, privateJwk } = await getVapidKeys();
  const aud = new URL(endpoint).origin;
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    new TextEncoder().encode(
      JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:support@flirtpulse.app" })
    )
  );
  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${publicKey}`;
}

/** Sends an empty push to one endpoint. Returns false when the subscription is gone. */
export async function sendPush(endpoint: string): Promise<boolean> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: await vapidHeader(endpoint), TTL: "86400", "Content-Length": "0", Urgency: "normal" },
  });
  if (res.status === 404 || res.status === 410) return false;
  if (!res.ok) console.error(`[webpush] push service answered ${res.status}`);
  return true;
}

/**
 * Pushes to every active subscriber; when `category` is given only to the
 * subscribers of that category. Returns the number of pushes sent.
 */
export async function pushToSubscribers(category?: string): Promise<number> {
  const subs = await query<any>("push_subscription", { _filter: { is_active: "yes" }, _limit: 5000 });
  const targets = subs.filter((s) => {
    if (!category) return true;
    return String(s.categories || "")
      .split(",")
      .map((c: string) => c.trim())
      .includes(category);
  });
  let sent = 0;
  for (const s of targets) {
    try {
      const alive = await sendPush(s.endpoint);
      if (alive) sent += 1;
      else await update("push_subscription", s._id, { is_active: "no" });
    } catch (err) {
      console.error("[webpush] send failed:", err);
    }
  }
  console.log(`[webpush] sent ${sent}/${targets.length} pushes${category ? ` (category ${category})` : ""}`);
  return sent;
}

export { b64urlToBytes };
