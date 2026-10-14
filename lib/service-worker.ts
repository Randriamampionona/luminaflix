/**
 * The app has ONE service worker (public/firebase-messaging-sw.js): it does
 * offline caching (PWA) and receives push notifications (FCM). A scope can only
 * have one worker, so everything registers it through this helper with the
 * exact same URL — otherwise registrations would keep replacing each other.
 *
 * In development the URL carries `?dev=1`, which turns caching off inside the
 * worker (push keeps working) so `yarn dev` never serves stale files.
 */
const SW_URL =
  process.env.NODE_ENV === "production" ? "/firebase-messaging-sw.js" : "/firebase-messaging-sw.js?dev=1";

export function registerServiceWorker() {
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}
