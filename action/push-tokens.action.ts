"use server";

import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { headers } from "next/headers";
import { isLocale } from "@/i18n/config";
import { lookupGeo } from "@/lib/analytics/geo";
import { clientIpFromHeaders, hashIp, maskIp } from "@/lib/analytics/ip";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * Push subscriptions for EVERY visitor (signed in or not), one document per
 * IP address:
 *
 * NOTIFICATION/{ipHash}
 *   fcmTokens: string[]        one per browser/device on this IP (newest last, max 20)
 *   ipAddress: "196.192.42.0"  masked IP (last block removed) — the raw IP is never stored
 *   ipHash:    string          salted hash of the IP (same as ANALYTICS.ipHash)
 *   country:   "MG"
 *   tokenLocales: { [token]: "fr" | "en" }  language of each browser's notifications
 *   locale:    "fr" | "en"     language of the latest subscription (fallback)
 *   userId:    string | null   Clerk id when the visitor was signed in
 *   pushEnabled: true
 *   createdAt / updatedAt
 *
 * A browser keeps the same token when its IP changes (Wi-Fi ↔ 4G), so the
 * token is moved: removed from any other IP document, added to the current one.
 */
const COLLECTION = "NOTIFICATION";
const MAX_TOKENS_PER_IP = 20; // households / offices share one IP
// FCM registration tokens: ~150–300 chars of [A-Za-z0-9_:-].
const TOKEN_RE = /^[\w:-]{20,4096}$/;

// Basic abuse protection: 20 saves per IP per 10 minutes (per server instance).
const recent = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 600_000);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 10_000) recent.clear();
  return hits.length > 20;
}

export async function savePushToken(token: string, locale: string): Promise<{ ok: boolean }> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return { ok: false };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const ipHash = hashIp(ip);
  if (rateLimited(ipHash)) return { ok: false };

  try {
    const [{ userId }, geo] = await Promise.all([auth(), lookupGeo(h, ip)]);
    const db = getDb();
    const col = db.collection(COLLECTION);
    const ref = col.doc(ipHash);
    const FieldValue = admin.firestore.FieldValue;

    const lang = isLocale(locale) ? locale : null;

    // Same browser seen on another IP before: move its token here.
    const elsewhere = await col.where("fcmTokens", "array-contains", token).get();
    const batch = db.batch();
    for (const doc of elsewhere.docs) {
      if (doc.id === ipHash) continue;
      batch.update(
        doc.ref,
        "fcmTokens",
        FieldValue.arrayRemove(token),
        new admin.firestore.FieldPath("tokenLocales", token),
        FieldValue.delete(),
      );
    }

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() ?? {};
      const current: string[] = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      const tokens = [...current.filter((t) => t !== token), token].slice(-MAX_TOKENS_PER_IP);
      // Only keep languages of tokens still in the list.
      const previous: Record<string, string> = data.tokenLocales ?? {};
      const tokenLocales = Object.fromEntries(
        tokens.flatMap((t) => {
          const value = t === token ? (lang ?? previous[t]) : previous[t];
          return value ? [[t, value]] : [];
        }),
      );
      const fields = {
        fcmTokens: tokens,
        tokenLocales,
        ipHash,
        ipAddress: maskIp(ip),
        country: geo.country,
        pushEnabled: true,
        updatedAt: FieldValue.serverTimestamp(),
        ...(lang && { locale: lang }),
        // Keep the last known account on this IP (useful for test sends); never erase it.
        ...(userId && { userId }),
      };
      // update() replaces tokenLocales as a whole (set+merge would only add keys).
      if (snap.exists) tx.update(ref, fields);
      else tx.set(ref, { ...fields, createdAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
    return { ok: true };
  } catch (error) {
    logFirebaseError("push-token:save", error);
    return { ok: false };
  }
}
