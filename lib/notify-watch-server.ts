import "server-only";
import { BrevoClient } from "@getbrevo/brevo";
import admin from "firebase-admin";
import { createTranslator } from "next-intl";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import { renderTitleAvailableEmail } from "@/lib/emails/title-available";
import { checkFrAvailability, type FrKind } from "@/lib/fr-availability";
import { getDb, getMessaging, logFirebaseError } from "@/lib/firebase-admin";
import { SITE_URL } from "@/lib/site-url";

/**
 * "Notify me" alerts (players + /coming-soon). One document per title — per
 * episode for series — in NOTIFY_WATCH:
 *   movie_{id}                    a movie
 *   {kind}_{id}_s{season}e{ep}    an episode (kind: tv | kdrama | anime)
 * with the signed-in users waiting for it (users.{userId} → e-mail, language)
 * and their browsers' push tokens (subs.{token} → language).
 * The daily push cron checks every document: once the title exists in VF or
 * VOSTFR, everyone gets a push notification and an e-mail, then the document
 * is deleted. Documents older than 180 days are dropped.
 */
const COL = "NOTIFY_WATCH";
const MESSAGES = { en, fr } as const;
type Locale = keyof typeof MESSAGES;
const MAX_AGE_MS = 180 * 24 * 3600 * 1000;
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";

export type WatchKind = "movie" | "tv" | "kdrama" | "anime";
const FR_KIND: Record<WatchKind, FrKind> = { movie: "movie", tv: "tv", kdrama: "drama", anime: "anime" };
const BASE_PATH: Record<WatchKind, string> = {
  movie: "/movies",
  tv: "/tv-shows/play",
  kdrama: "/k-drama/play",
  anime: "/anime/play",
};

export interface WatchTarget {
  kind: WatchKind;
  id: string;
  season?: number;
  episode?: number;
}

const watchKey = ({ kind, id, season, episode }: WatchTarget) =>
  kind === "movie" ? `movie_${id}` : `${kind}_${id}_s${season ?? 1}e${episode ?? 1}`;

/** Page to open when the title is available. */
const pathFor = ({ kind, id, season, episode }: WatchTarget) =>
  kind === "movie" ? `${BASE_PATH.movie}/${id}` : `${BASE_PATH[kind]}/${id}?s=${season ?? 1}&e=${episode ?? 1}`;

const toLocale = (value: string): Locale => (value.startsWith("fr") ? "fr" : "en");

export async function addWatcher(
  target: WatchTarget,
  input: {
    title: string;
    posterPath: string | null;
    userId: string;
    email: string | null;
    name: string | null;
    locale: string;
    token: string | null;
  },
) {
  const locale = toLocale(input.locale);
  await getDb()
    .collection(COL)
    .doc(watchKey(target))
    .set(
      {
        kind: target.kind,
        id: target.id,
        ...(target.kind !== "movie" && { season: target.season ?? 1, episode: target.episode ?? 1 }),
        title: input.title.slice(0, 200),
        posterPath: input.posterPath,
        path: pathFor(target),
        users: { [input.userId]: { email: input.email, name: input.name, locale } },
        ...(input.token && { subs: { [input.token]: locale } }),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function removeWatcher(target: WatchTarget, userId: string, token: string | null) {
  const updates: (string | admin.firestore.FieldPath | admin.firestore.FieldValue)[] = [
    new admin.firestore.FieldPath("users", userId),
    admin.firestore.FieldValue.delete(),
  ];
  if (token) updates.push(new admin.firestore.FieldPath("subs", token), admin.firestore.FieldValue.delete());
  const [first, firstValue, ...rest] = updates;
  await getDb()
    .collection(COL)
    .doc(watchKey(target))
    .update(first as admin.firestore.FieldPath, firstValue, ...rest)
    .catch(() => {});
}

export async function isWatching(target: WatchTarget, userId: string) {
  const snap = await getDb().collection(COL).doc(watchKey(target)).get();
  return Boolean(snap.get(new admin.firestore.FieldPath("users", userId)));
}

/** Run by the daily push cron. */
export async function notifyAvailableTitles() {
  const result = { checked: 0, notified: 0, pushSent: 0, emailsSent: 0 };
  try {
    const db = getDb();
    const snap = await db.collection(COL).limit(80).get();
    const apiKey = process.env.BREVO_API_KEY;
    const brevo = apiKey ? new BrevoClient({ apiKey }) : null;

    for (const doc of snap.docs) {
      const d = doc.data();
      const kind = (d.kind as WatchKind) in FR_KIND ? (d.kind as WatchKind) : "movie";
      const target: WatchTarget = { kind, id: String(d.id), season: d.season, episode: d.episode };
      const created = (d.createdAt as admin.firestore.Timestamp | undefined)?.toMillis() ?? Date.now();
      const subs = Object.entries((d.subs ?? {}) as Record<string, string>);
      const users = Object.entries(
        (d.users ?? {}) as Record<string, { email?: string | null; name?: string | null; locale?: string }>,
      );
      if ((subs.length === 0 && users.length === 0) || Date.now() - created > MAX_AGE_MS) {
        await doc.ref.delete();
        continue;
      }
      result.checked++;
      const availability = await checkFrAvailability(FR_KIND[kind], target.id, {
        season: target.season ?? 1,
        episode: target.episode ?? 1,
      });
      if (availability.available !== true) continue;

      const langs = availability.langs.length
        ? availability.langs.map((l) => l.toUpperCase()).join(" / ")
        : availability.version || "VF";
      const path = typeof d.path === "string" && d.path.startsWith("/") ? d.path : pathFor(target);
      const url = new URL(path, SITE_URL).toString();
      const episodeLabel = kind === "movie" ? "" : ` · S${target.season ?? 1}E${target.episode ?? 1}`;
      const title = `${d.title}${episodeLabel}`;
      const poster = d.posterPath ? `https://image.tmdb.org/t/p/w500${d.posterPath}` : "";

      // Push notifications (browsers that allowed them)
      for (const locale of ["fr", "en"] as Locale[]) {
        const tokens = subs.filter(([, l]) => l === locale).map(([token]) => token);
        if (tokens.length === 0) continue;
        const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "comingSoon.push" });
        const res = await getMessaging()
          .sendEachForMulticast({
            tokens: tokens.slice(0, 500),
            data: {
              title: t("title", { title, langs }),
              body: t("body"),
              image: poster,
              icon: new URL("/icons/icon-192.png", SITE_URL).toString(),
              badge: new URL("/icons/badge-72.png", SITE_URL).toString(),
              url,
              tag: `luminaflix-available-${doc.id}`,
              lang: locale,
            },
            webpush: { headers: { TTL: "172800", Urgency: "normal" } },
          })
          .catch(() => null);
        result.pushSent += res?.successCount ?? 0;
      }

      // E-mails (signed-in users)
      if (brevo) {
        for (const [, user] of users) {
          if (!user.email) continue;
          const mail = renderTitleAvailableEmail({
            locale: toLocale(user.locale ?? "fr"),
            name: user.name ?? null,
            title,
            langs,
            url,
            poster,
            domain: SITE_URL,
          });
          try {
            await brevo.transactionalEmails.sendTransacEmail({
              subject: mail.subject,
              sender: { email: FROM_EMAIL, name: "LuminaFlix" },
              to: [{ email: user.email, name: user.name || undefined }],
              htmlContent: mail.html,
              textContent: mail.text,
              tags: ["notify-available"],
            });
            result.emailsSent++;
          } catch (error) {
            logFirebaseError("notify-watch:email", error);
          }
        }
      }

      result.notified++;
      await doc.ref.delete();
    }
  } catch (error) {
    logFirebaseError("notify-watch", error);
  }
  return result;
}
