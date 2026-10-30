import "server-only";
import admin from "firebase-admin";
import { createTranslator } from "next-intl";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { checkFrAvailability } from "@/lib/fr-availability";
import { getDb, getMessaging, logFirebaseError } from "@/lib/firebase-admin";

/**
 * "Notify me" alerts (/coming-soon): NOTIFY_WATCH/{movie_<id>} holds the push
 * tokens of the browsers waiting for a title (token → language). The daily
 * push cron checks each title: once it exists in VF or VOSTFR, the waiting
 * browsers get a notification and the document is deleted.
 */
const COL = "NOTIFY_WATCH";
const MESSAGES = { en, fr } as const;
type Locale = keyof typeof MESSAGES;
const MAX_AGE_MS = 180 * 24 * 3600 * 1000;

const domain = () => process.env.NEXT_PUBLIC_DOMAIN || "https://lumina-flix.vercel.app";

export async function addWatcher(input: { id: string; title: string; posterPath: string | null; token: string; locale: string }) {
  const locale: Locale = input.locale.startsWith("fr") ? "fr" : "en";
  await getDb()
    .collection(COL)
    .doc(`movie_${input.id}`)
    .set(
      {
        kind: "movie",
        id: input.id,
        title: input.title.slice(0, 200),
        posterPath: input.posterPath,
        subs: { [input.token]: locale },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function removeWatcher(id: string, token: string) {
  await getDb()
    .collection(COL)
    .doc(`movie_${id}`)
    .update(new admin.firestore.FieldPath("subs", token), admin.firestore.FieldValue.delete())
    .catch(() => {});
}

/** Run by the daily push cron. */
export async function notifyAvailableTitles() {
  const result = { checked: 0, notified: 0, sent: 0 };
  try {
    const db = getDb();
    const snap = await db.collection(COL).limit(60).get();
    for (const doc of snap.docs) {
      const d = doc.data();
      const created = (d.createdAt as admin.firestore.Timestamp | undefined)?.toMillis() ?? Date.now();
      const subs = Object.entries((d.subs ?? {}) as Record<string, string>);
      if (subs.length === 0 || Date.now() - created > MAX_AGE_MS) {
        await doc.ref.delete();
        continue;
      }
      result.checked++;
      const availability = await checkFrAvailability("movie", String(d.id));
      if (availability.available !== true) continue;

      const langs = availability.langs.length
        ? availability.langs.map((l) => l.toUpperCase()).join(" / ")
        : availability.version || "VF";
      const url = new URL(`/movies/${d.id}`, domain()).toString();
      for (const locale of ["fr", "en"] as Locale[]) {
        const tokens = subs.filter(([, l]) => l === locale).map(([token]) => token);
        if (tokens.length === 0) continue;
        const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "comingSoon.push" });
        const res = await getMessaging().sendEachForMulticast({
          tokens: tokens.slice(0, 500),
          data: {
            title: t("title", { title: d.title, langs }),
            body: t("body"),
            image: d.posterPath ? `https://image.tmdb.org/t/p/w500${d.posterPath}` : "",
            icon: new URL("/icons/icon-192.png", domain()).toString(),
            badge: new URL("/icons/badge-72.png", domain()).toString(),
            url,
            tag: `luminaflix-available-${d.id}`,
            lang: locale,
          },
          webpush: { headers: { TTL: "172800", Urgency: "normal" } },
        });
        result.sent += res.successCount;
      }
      result.notified++;
      await doc.ref.delete();
    }
  } catch (error) {
    logFirebaseError("notify-watch", error);
  }
  return result;
}
