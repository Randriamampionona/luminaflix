"use server";

import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { isLocale } from "@/i18n/config";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * FCM token storage on USERS/{clerkId}:
 *   fcmTokens: string[]   (one per browser/device, newest last, max 10)
 *   locale: "fr" | "en"   (language of the notifications, shared with emails)
 *   pushEnabled: boolean
 *   pushUpdatedAt: timestamp
 */
const MAX_TOKENS_PER_USER = 10;
// FCM registration tokens: ~150–300 chars of [A-Za-z0-9_:-].
const TOKEN_RE = /^[\w:-]{20,4096}$/;

export async function savePushToken(token: string, locale: string): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId || typeof token !== "string" || !TOKEN_RE.test(token)) return { ok: false };

  try {
    const db = getDb();
    const ref = db.collection("USERS").doc(userId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current: string[] = Array.isArray(snap.data()?.fcmTokens) ? snap.data()!.fcmTokens : [];
      const tokens = [...current.filter((t) => t !== token), token].slice(-MAX_TOKENS_PER_USER);
      tx.set(
        ref,
        {
          fcmTokens: tokens,
          pushEnabled: true,
          pushUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(isLocale(locale) && { locale }),
        },
        { merge: true },
      );
    });
    return { ok: true };
  } catch (error) {
    logFirebaseError("push-token:save", error);
    return { ok: false };
  }
}

/** Called when the user turns notifications off on this device. */
export async function removePushToken(token: string): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId || typeof token !== "string" || !TOKEN_RE.test(token)) return { ok: false };

  try {
    const ref = getDb().collection("USERS").doc(userId);
    await ref.set(
      {
        fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
        pushUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ok: true };
  } catch (error) {
    logFirebaseError("push-token:remove", error);
    return { ok: false };
  }
}
