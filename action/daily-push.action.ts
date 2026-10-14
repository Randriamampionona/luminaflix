// Not a "use server" module: only reachable through the authenticated cron
// route (app/api/cron/push), never as a callable server action.
import "server-only";
import admin from "firebase-admin";
import { createTranslator } from "next-intl";
import { locales, localeMeta, type Locale, isLocale } from "@/i18n/config";
import { getDb, getMessaging, logFirebaseError } from "@/lib/firebase-admin";
import { getTrailerHref, getWatchHref, inferMediaKind } from "@/lib/media";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * Daily push notification ("Tonight's pick"), sent separately from the daily
 * email, on its own cron-job.org schedule (see app/api/cron/push/route.ts).
 *
 * - Picks one trending title (movie or series) with artwork, never the same
 *   as the previous push.
 * - Sent to every subscribed browser (NOTIFICATION, by IP — signed in or not),
 *   localised with the language saved with the subscription (French by default).
 * - Data-only FCM messages: the service worker (public/firebase-messaging-sw.js)
 *   renders the notification itself, with image and action buttons.
 * - Tokens that FCM reports as dead are removed from Firestore.
 *
 * Env: NEXT_PUBLIC_DOMAIN, NEWSLETTER_DEFAULT_LOCALE, PUSH_TEST_USER_IDS
 * (comma-separated Clerk ids; outside production only these users receive it).
 */
const IS_PROD = process.env.NODE_ENV === "production";
const DEFAULT_LOCALE: Locale = isLocale(process.env.NEWSLETTER_DEFAULT_LOCALE)
  ? process.env.NEWSLETTER_DEFAULT_LOCALE
  : "fr";
const MESSAGES = { en, fr: fr as typeof en };
const MULTICAST_LIMIT = 500;
const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

interface Recipient {
  /** Firestore document holding the tokens, e.g. "NOTIFICATION/ab12…" or "USERS/user_…". */
  path: string;
  tokens: string[];
  locale: Locale;
}

const truncate = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, "")}…` : clean;
};

const domain = () => process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

function tracked(path: string, content: string, locale: Locale) {
  const url = new URL(path, domain());
  url.searchParams.set("utm_source", "push");
  url.searchParams.set("utm_medium", "web_push");
  url.searchParams.set("utm_campaign", "daily_pick");
  url.searchParams.set("utm_content", `${content}_${locale}`);
  return url.toString();
}

/** A trending title with artwork and a synopsis, different from the last push. */
async function pickTitle(lastId?: number): Promise<Movie | null> {
  const data = await tmdb<TMDBResponse>(
    "/trending/all/day",
    { language: "en-US" },
    { revalidate: REVALIDATE.short, localized: false },
  );
  const candidates = (data?.results ?? []).filter(
    (item) =>
      (item.media_type === "movie" || item.media_type === "tv") &&
      item.backdrop_path &&
      (item.overview ?? "").length > 40 &&
      (item.vote_average ?? 0) >= 6 &&
      item.id !== lastId,
  );
  const pool = candidates.slice(0, 10);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

/** Title + overview in every language (English as fallback for missing translations). */
async function localize(item: Movie): Promise<Record<Locale, Movie>> {
  const path = item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
  const details = await Promise.all(
    locales.map((locale) =>
      tmdb<Movie>(path, { language: localeMeta[locale].tmdb }, { revalidate: REVALIDATE.default, localized: false }),
    ),
  );
  return Object.fromEntries(
    locales.map((locale, i) => {
      const d = details[i];
      return [
        locale,
        {
          ...item,
          ...d,
          media_type: item.media_type,
          title: d?.title || item.title,
          name: d?.name || item.name,
          overview: d?.overview || item.overview,
        },
      ];
    }),
  ) as Record<Locale, Movie>;
}

/** FCM data payload (all values must be strings) for one language. */
function buildPayload(item: Movie, locale: Locale): Record<string, string> {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "push.message" });
  const kind = inferMediaKind(item);
  const title = item.title || item.name || "LuminaFlix";
  const watch = tracked(getWatchHref(item.id, kind), "watch", locale);
  const trailer = tracked(getTrailerHref(item.id, kind), "trailer", locale);

  return {
    title: kind === "movie" ? t("title", { title }) : t("titleSeries", { title }),
    body: truncate(item.overview || t("fallbackBody"), 140),
    image: `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
    icon: new URL("/icons/icon-192.png", domain()).toString(),
    badge: new URL("/icons/badge-72.png", domain()).toString(),
    url: watch,
    tag: "luminaflix-daily-pick",
    lang: locale,
    actions: JSON.stringify([
      { action: "watch", title: t("watch"), url: watch },
      { action: "trailer", title: t("trailer"), url: trailer },
    ]),
  };
}

/**
 * Every subscribed browser:
 * - NOTIFICATION/{ipHash}: all visitors, signed in or not (current storage);
 * - USERS/{id}.fcmTokens: older subscriptions from signed-in users (still sent
 *   until those browsers re-save their token under NOTIFICATION).
 * Test mode keeps only PUSH_TEST_USER_IDS (USERS id, or NOTIFICATION docs
 * whose last signed-in account is one of them).
 */
async function getRecipients(testOnly: boolean): Promise<Recipient[]> {
  const testIds = new Set(
    (process.env.PUSH_TEST_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (testOnly && testIds.size === 0) return [];

  const db = getDb();
  const [ipDocs, userDocs] = await Promise.all([
    db.collection("NOTIFICATION").select("fcmTokens", "tokenLocales", "locale", "pushEnabled", "userId").get(),
    db.collection("USERS").select("fcmTokens", "locale", "pushEnabled").get(),
  ]);

  type TokenDoc = {
    fcmTokens?: unknown;
    locale?: string;
    pushEnabled?: boolean;
    tokenLocales?: Record<string, string>;
  };
  // One recipient per (document, language): each browser keeps its own language.
  const toRecipients = (path: string, data: TokenDoc): Recipient[] => {
    if (data.pushEnabled === false || !Array.isArray(data.fcmTokens)) return [];
    const fallback = isLocale(data.locale) ? data.locale : DEFAULT_LOCALE;
    const byLang = new Map<Locale, string[]>();
    for (const token of data.fcmTokens.filter((t): t is string => typeof t === "string")) {
      const own = data.tokenLocales?.[token];
      const lang = isLocale(own) ? own : fallback;
      byLang.set(lang, [...(byLang.get(lang) ?? []), token]);
    }
    return [...byLang].map(([locale, tokens]) => ({ path, tokens, locale }));
  };

  return [
    ...ipDocs.docs
      .filter((doc) => !testOnly || testIds.has(String(doc.data().userId ?? "")))
      .flatMap((doc) => toRecipients(`NOTIFICATION/${doc.id}`, doc.data())),
    ...userDocs.docs
      .filter((doc) => !testOnly || testIds.has(doc.id))
      .flatMap((doc) => toRecipients(`USERS/${doc.id}`, doc.data())),
  ];
}

export async function triggerDailyPush({ test = false }: { test?: boolean } = {}) {
  const testOnly = test || !IS_PROD;
  const db = getDb();
  const metaRef = db.collection("META").doc("push");

  try {
    const lastId = (await metaRef.get()).data()?.lastTitleId as number | undefined;
    const item = await pickTitle(lastId);
    if (!item) return { success: false, error: "No trending title available from TMDB" };

    const [localized, recipients] = await Promise.all([localize(item), getRecipients(testOnly)]);
    if (recipients.length === 0) {
      return { success: true, title: item.title || item.name, devices: 0, sent: 0, failed: 0, removed: 0, testOnly };
    }

    // Token → documents holding it (to clean up dead tokens). A browser can
    // appear in both collections: it is notified once (NOTIFICATION's language wins).
    const owners = new Map<string, string[]>();
    const byLocale = new Map<Locale, string[]>();
    for (const r of recipients) {
      for (const token of r.tokens) {
        const known = owners.get(token);
        owners.set(token, [...(known ?? []), r.path]);
        if (!known) byLocale.set(r.locale, [...(byLocale.get(r.locale) ?? []), token]);
      }
    }

    const messaging = getMessaging();
    const dead: string[] = [];
    let sent = 0;
    let failed = 0;

    for (const [locale, tokens] of byLocale) {
      const data = buildPayload(localized[locale], locale);
      for (let i = 0; i < tokens.length; i += MULTICAST_LIMIT) {
        const batch = tokens.slice(i, i + MULTICAST_LIMIT);
        const res = await messaging.sendEachForMulticast({
          tokens: batch,
          data,
          // Deliver within 12 h, otherwise drop (yesterday's pick is stale).
          webpush: { headers: { TTL: "43200", Urgency: "normal" } },
        });
        sent += res.successCount;
        failed += res.failureCount;
        res.responses.forEach((r, index) => {
          if (!r.success && r.error && DEAD_TOKEN_CODES.has(r.error.code)) dead.push(batch[index]);
        });
      }
    }

    // Remove dead tokens from every document holding them.
    const deadByDoc = new Map<string, string[]>();
    for (const token of dead) {
      for (const path of owners.get(token) ?? []) deadByDoc.set(path, [...(deadByDoc.get(path) ?? []), token]);
    }
    await Promise.all(
      [...deadByDoc].map(([path, tokens]) => {
        const FieldValue = admin.firestore.FieldValue;
        const languageFields = path.startsWith("NOTIFICATION/")
          ? tokens.flatMap((t) => [new admin.firestore.FieldPath("tokenLocales", t), FieldValue.delete()])
          : [];
        return db
          .doc(path)
          .update("fcmTokens", FieldValue.arrayRemove(...tokens), ...languageFields)
          .catch((error) => logFirebaseError("daily-push:cleanup", error));
      }),
    );

    if (!testOnly) {
      await metaRef.set(
        { lastTitleId: item.id, lastSentAt: admin.firestore.FieldValue.serverTimestamp(), sent, failed },
        { merge: true },
      );
    }

    return {
      success: true,
      title: item.title || item.name,
      devices: owners.size,
      sent,
      failed,
      removed: dead.length,
      testOnly,
    };
  } catch (error) {
    logFirebaseError("daily-push", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
