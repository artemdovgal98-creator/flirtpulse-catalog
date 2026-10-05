"use client";

/**
 * Opt-in Web Push (browser side). The service worker `/sw.js` is registered by
 * AppShell; the server keeps one `push_subscription` row per endpoint.
 */

import { api } from "@/lib/api";
import { getVisitorId } from "@/lib/visitor";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) {
    console.log("[push] no service worker yet — registering /sw.js");
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }
  return navigator.serviceWorker.ready;
}

/** Subscribes this browser (or refreshes the categories of an existing subscription). */
export async function enablePush(categories: string[], language: string): Promise<boolean> {
  try {
    if (!isPushSupported()) {
      console.log("[push] not supported in this browser");
      return false;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[push] permission was not granted:", permission);
      return false;
    }
    const reg = await getRegistration();
    if (!reg) return false;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyRes = await api.get<{ publicKey: string }>("/api/push/vapid");
      if (!keyRes.ok || !keyRes.data?.publicKey) {
        console.error("[push] VAPID key unavailable:", keyRes.error);
        return false;
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey),
      });
    }

    const res = await api.post("/api/push/subscribe", {
      endpoint: sub.endpoint,
      keys: sub.toJSON().keys,
      subscription: sub.toJSON(),
      categories,
      language,
      visitorId: getVisitorId(),
    });
    if (!res.ok) {
      console.error("[push] server rejected the subscription:", res.error);
      return false;
    }
    console.log(`[push] enabled for ${categories.length ? categories.join(",") : "all categories"}`);
    return true;
  } catch (err) {
    console.error("[push] enable failed:", err);
    return false;
  }
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch((err) => console.error("[push] browser unsubscribe failed:", err));
  const res = await api.post("/api/push/unsubscribe", { endpoint });
  if (!res.ok) console.error("[push] server unsubscribe failed:", res.error);
  console.log("[push] disabled");
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    if (!isPushSupported() || Notification.permission !== "granted") return false;
    const reg = await navigator.serviceWorker.getRegistration("/");
    return !!(await reg?.pushManager.getSubscription());
  } catch (err) {
    console.error("[push] status check failed:", err);
    return false;
  }
}
