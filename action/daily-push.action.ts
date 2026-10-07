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
 * - Localised per user (USERS/{id}.locale, French by default).
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
  userId: string;
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

async function getRecipients(testOnly: boolean): Promise<Recipient[]> {
  const testIds = new Set(
    (process.env.PUSH_TEST_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  if (testOnly && testIds.size === 0) return [];

  const snapshot = await getDb().collection("USERS").select("fcmTokens", "locale", "pushEnabled").get();
  return snapshot.docs
    .filter((doc) => !testOnly || testIds.has(doc.id))
    .map((doc) => {
      const data = doc.data() as { fcmTokens?: unknown; locale?: string; pushEnabled?: boolean };
      const tokens = Array.isArray(data.fcmTokens)
        ? data.fcmTokens.filter((t): t is string => typeof t === "string")
        : [];
      return {
        userId: doc.id,
        tokens: data.pushEnabled === false ? [] : tokens,
        locale: isLocale(data.locale) ? data.locale : DEFAULT_LOCALE,
      };
    })
    .filter((r) => r.tokens.length > 0);
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

    // Token → owner, to clean up dead tokens afterwards.
    const owner = new Map<string, string>();
    const byLocale = new Map<Locale, string[]>();
    for (const r of recipients) {
      for (const token of r.tokens) {
        owner.set(token, r.userId);
        byLocale.set(r.locale, [...(byLocale.get(r.locale) ?? []), token]);
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

    // Remove dead tokens (grouped per user).
    const deadByUser = new Map<string, string[]>();
    for (const token of dead) {
      const userId = owner.get(token);
      if (userId) deadByUser.set(userId, [...(deadByUser.get(userId) ?? []), token]);
    }
    await Promise.all(
      [...deadByUser].map(([userId, tokens]) =>
        db
          .collection("USERS")
          .doc(userId)
          .update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens) })
          .catch((error) => logFirebaseError("daily-push:cleanup", error)),
      ),
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
      devices: owner.size,
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
