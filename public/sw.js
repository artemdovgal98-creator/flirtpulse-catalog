/* FlirtPulse service worker — static cache, network-first pages, payload-less push. */
const VERSION = "fp-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const META_CACHE = "fp-meta";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .catch((err) => console.error("[sw] precache failed:", err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE && k !== META_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never touch API calls, tracking redirects or admin screens.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/go/") || url.pathname.startsWith("/admin")) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(PAGE_CACHE);
          return (await cache.match(req)) || (await cache.match(OFFLINE_URL)) || Response.error();
        })
    );
  }
});

// The page tells us the visitor's language (no localStorage in a worker).
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "fp-lang" && typeof data.lang === "string") {
    event.waitUntil(
      caches.open(META_CACHE).then((cache) => cache.put("/__fp_lang", new Response(data.lang)))
    );
  }
});

async function storedLang() {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match("/__fp_lang");
    if (res) return (await res.text()) || "ru";
  } catch (err) {
    console.error("[sw] could not read stored language:", err);
  }
  return "ru";
}

// Pushes carry no payload: fetch the newest notification and show it.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "FlirtPulse";
      let body = "";
      let link = "/";
      let tag = "flirtpulse";
      try {
        const lang = await storedLang();
        const res = await fetch(`/api/notifications?lang=${encodeURIComponent(lang)}&limit=1`, { cache: "no-store" });
        const json = await res.json();
        const item = json && json.ok && json.data && json.data.items && json.data.items[0];
        if (item) {
          title = item.title || title;
          body = item.body || "";
          link = item.link || "/";
          tag = `fp-${item._id}`;
        }
      } catch (err) {
        console.error("[sw] push fetch failed:", err);
      }
      await self.registration.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { link },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  const target = new URL(link, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === target && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
