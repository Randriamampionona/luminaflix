/**
 * Browser Firebase app + Realtime Database, loaded on demand (dynamic import)
 * so pages that never chat don't download the SDK.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

/** Realtime Database instance + its functions (same app as push notifications). */
export async function loadRealtimeDb() {
  const [{ initializeApp, getApps, getApp }, database] = await Promise.all([
    import("firebase/app"),
    import("firebase/database"),
  ]);
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { db: database.getDatabase(app, firebaseConfig.databaseURL), rtdb: database };
}
