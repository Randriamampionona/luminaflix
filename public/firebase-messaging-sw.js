/* LuminaFlix — push notification service worker (Firebase Cloud Messaging).
 *
 * The server sends FCM *data* messages (see action/daily-push.action.ts), so
 * this worker builds the notification itself: big image, icon, badge and
 * "Watch now" / "Trailer" buttons, and opens the right page on click.
 *
 * Handling the standard `push` event directly keeps this file dependency-free
 * (no Firebase scripts to download from a CDN); FCM delivers the same payload.
 */

const DEFAULT_ICON = "/icons/icon-192.png";
const DEFAULT_BADGE = "/icons/badge-72.png";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
