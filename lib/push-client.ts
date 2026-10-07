/**
 * Browser side of Firebase Cloud Messaging. The Firebase SDK is loaded on
 * demand (dynamic import), so it never weighs on pages where push isn't used.
 *
 * Env (public): NEXT_PUBLIC_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID,
 * _STORAGE_BUCKET, _MESSAGING_SENDER_ID, _APP_ID and _VAPID_KEY
 * (Firebase Console → Project settings → Cloud Messaging → Web Push certificates).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const SW_URL = "/firebase-messaging-sw.js";

/** Push needs: browser APIs + Firebase config + VAPID key. (iPhone: only from the Home Screen app.) */
export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!VAPID_KEY || !firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    return false;
  }
  try {
    const { isSupported } = await import("firebase/messaging");
    return await isSupported();
  } catch {
    return false;
  }
}

/** Rejects with a labelled error if `promise` takes longer than `ms` (so the UI never spins forever). */
function withTimeout<T>(promise: Promise<T>, ms: number, step: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[push] ${step} timed out after ${ms / 1000}s`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function messagingInstance() {
  const [{ initializeApp, getApps, getApp }, { getMessaging }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getMessaging(app);
}

async function registerWorker() {
  const registration = await withTimeout(
    navigator.serviceWorker.register(SW_URL, { scope: "/" }),
    15_000,
    "service worker registration",
  );
  await withTimeout(navigator.serviceWorker.ready, 15_000, "service worker activation");
  return registration;
}

/** Current FCM token for this browser (permission must already be granted). */
export async function getPushToken(): Promise<string | null> {
  const [{ getToken }, messaging, registration] = await Promise.all([
    import("firebase/messaging"),
    messagingInstance(),
    registerWorker(),
  ]);
  const token = await withTimeout(
    getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }),
    20_000,
    "FCM getToken",
  );
  return token || null;
}
