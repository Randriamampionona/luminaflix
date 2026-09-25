"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "./config";

/**
 * Persists the user's language choice. The caller refreshes the router.
 * For signed-in users it's also saved on their profile (USERS/{id}.locale),
 * so emails such as the daily picks arrive in the same language.
 */
export async function setUserLocale(locale: string) {
  if (!isLocale(locale)) return { ok: false as const };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  try {
    const { userId } = await auth();
    if (userId) await getDb().collection("USERS").doc(userId).set({ locale }, { merge: true });
  } catch (error) {
    // Best effort: the cookie is what drives the site.
    logFirebaseError("locale", error);
  }
  return { ok: true as const };
}