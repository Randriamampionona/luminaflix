/* LuminaFlix service worker — offline support (PWA) + push notifications (FCM).
 *
 * There is a single worker for the whole site (a scope can only have one), so
 * it does both jobs. It is registered from lib/service-worker.ts.
 *
 * Caching strategies
 * - Page navigations: network first, cached copy if the network fails or takes
 *   longer than 6 s, then the /offline page.
 * - Next.js build files (/_next/static, hashed, immutable) and app icons: cache first.
 * - Everything else (API, auth, analytics, React Server Component requests,
 *   video players, TMDB images…) goes straight to the network.
 * Bump CACHE_VERSION to drop all old caches after a big change.
 *
 * Push: the server sends FCM *data* messages (action/daily-push.action.ts) and
 * this worker builds the notification itself (image, icon, badge, buttons).
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE = `lf-static-${CACHE_VERSION}`;
const PAGES_CACHE = `lf-pages-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];
const MAX_CACHED_PAGES = 40;
const NETWORK_TIMEOUT_MS = 6000;
// Personal or private pages are never stored.
const NO_CACHE_PAGES = /^\/(favorites|analytics|sign-in|sign-up|api)(\/|$)/;
// `?dev=1` (added by `yarn dev`): no caching at all, push only.
const CACHING = !new URL(self.location.href).searchParams.has("dev");

const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_BADGE = "/icons/badge-72.png";

// ---------------------------------------------------------------- lifecycle

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      if (CACHING) {
        const cache = await caches.open(STATIC_CACHE);
        // One by one: a single failing URL must not abort the install.
        await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = CACHING ? [STATIC_CACHE, PAGES_CACHE] : [];
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("lf-") && !keep.includes(n)).map((n) => caches.delete(n)));
      if (CACHING && self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

// ------------------------------------------------------------------ caching

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

async function networkFirstPage(event) {
  const request = event.request;
  const url = new URL(request.url);
  const cache = await caches.open(PAGES_CACHE);
  const cached = await cache.match(request);

  const network = (async () => {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(request));
    if (response.ok && response.type === "basic" && !NO_CACHE_PAGES.test(url.pathname)) {
      const copy = response.clone();
      event.waitUntil(cache.put(request, copy).then(() => trimCache(PAGES_CACHE, MAX_CACHED_PAGES)));
    }
    return response;
  })();

  try {
    // Only race the clock when there is a cached copy to fall back on.
    return cached ? await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)]) : await network;
  } catch {
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  if (!CACHING) return;
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // players, TMDB, Clerk, analytics…
  if (url.pathname.startsWith("/api/")) return;
  // Next.js client navigations / prefetches (RSC payloads): never cache.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc") || request.headers.has("Next-Router-Prefetch")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
});

// --------------------------------------------------------------------- push

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { data: { body: event.data.text() } };
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);
  // Data messages arrive as { data: {...} }; notification messages as { notification: {...} }.
  const data = payload.data || {};
  const fallback = payload.notification || {};

  let actions = [];
  try {
    actions = JSON.parse(data.actions || "[]");
  } catch {
    actions = [];
  }

  const title = data.title || fallback.title || "LuminaFlix";
  const options = {
    body: data.body || fallback.body || "",
    icon: data.icon || fallback.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    image: data.image || fallback.image || undefined,
    tag: data.tag || "luminaflix",
    renotify: true,
    lang: data.lang || undefined,
    timestamp: Date.now(),
    data: {
      url: data.url || fallback.click_action || "/",
      actions: Object.fromEntries(actions.map((a) => [a.action, a.url])),
    },
    // Shown on Chrome / Edge (desktop & Android); other browsers ignore them.
    actions: actions.slice(0, 2).map((a) => ({ action: a.action, title: a.title })),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = (event.action && data.actions && data.actions[event.action]) || data.url || "/";
  const url = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // Reuse an open LuminaFlix tab when there is one.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.navigate(url).then((c) => (c || client).focus());
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
