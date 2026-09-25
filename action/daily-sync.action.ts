// SECURITY: not a "use server" module. As a server action, triggerDailySync
// (which emails every user) would be a callable endpoint; it is only
// reachable through the authenticated cron route (app/api/cron/sync).
import "server-only";
import { BrevoClient } from "@getbrevo/brevo";
import { getAllAnime } from "@/action/get-all-anime.action";
import { getAllKDramas } from "@/action/get-all-kdramas.action";
import { getAllMovies } from "@/action/get-all-movies.action";
import { isLocale, type Locale } from "@/i18n/config";
import {
  dailyPicksWebUrl,
  loadDailyPicksContent,
  unsubscribeMailto,
  type DailyPicksIds,
} from "@/lib/emails/daily-picks-content";
import { renderDailyPicksEmail } from "@/lib/emails/daily-picks-email";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * Daily "picks" newsletter: one featured movie + a K-drama + an anime,
 * in the recipient's language (EN/FR) with an in-email language switch.
 *
 * Env:
 * - BREVO_API_KEY               (required)
 * - NEWSLETTER_FROM_EMAIL       sender (falls back to CONTACT_FROM_EMAIL), verified in Brevo
 * - NEWSLETTER_TEST_EMAIL       recipient of the single preview sent outside production
 * - NEWSLETTER_DEFAULT_LOCALE   "en" | "fr" for users with no saved language (default "en")
 * - NEXT_PUBLIC_DOMAIN          absolute site URL used in links
 */
const IS_PROD = process.env.NODE_ENV === "production";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";
const FROM_NAME = "LuminaFlix";
const TEST_EMAIL = process.env.NEWSLETTER_TEST_EMAIL || "tojorandriaii474@gmail.com";
const DEFAULT_LOCALE: Locale = isLocale(process.env.NEWSLETTER_DEFAULT_LOCALE)
  ? process.env.NEWSLETTER_DEFAULT_LOCALE
  : "en";

/** Parallel sends at a time (keeps us well under Brevo's rate limits). */
const CONCURRENCY = 10;

interface Recipient {
  email: string;
  firstName?: string;
  locale: Locale;
}

/**
 * Picks a title worth featuring: has artwork and a synopsis, from the most
 * popular results (pages 1–5).
 */
function pickFeatured(data: TMDBResponse, needsBackdrop = false): Movie | null {
  const candidates = (data?.results ?? []).filter(
    (item) =>
      (needsBackdrop ? item.backdrop_path : item.poster_path) &&
      (item.overview ?? "").length > 40 &&
      (item.vote_average ?? 0) >= 6,
  );
  const pool = candidates.length > 0 ? candidates : (data?.results ?? []);
  return pool.length ? pool[Math.floor(Math.random() * Math.min(pool.length, 12))] : null;
}

const randomPage = () => Math.floor(Math.random() * 5) + 1;

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.allSettled(items.slice(i, i + limit).map(fn))));
  }
  return results;
}

async function getRecipients(): Promise<Recipient[]> {
  if (!IS_PROD) return [{ email: TEST_EMAIL, firstName: "Tooj", locale: DEFAULT_LOCALE }];
  const snapshot = await getDb().collection("USERS").get();
  return snapshot.docs
    .map((doc) => doc.data() as { email?: string; firstName?: string; locale?: string })
    .filter((user) => !!user.email)
    .map((user) => ({
      email: user.email as string,
      firstName: user.firstName,
      // Saved by setUserLocale when a signed-in user switches language.
      locale: isLocale(user.locale) ? user.locale : DEFAULT_LOCALE,
    }));
}

export async function triggerDailySync() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[daily-sync] BREVO_API_KEY is not set");
    return { success: false, error: "BREVO_API_KEY is not set" };
  }
  const domain = (IS_PROD ? process.env.NEXT_PUBLIC_DOMAIN : undefined) || "http://localhost:3000";

  try {
    const [movieData, dramaData, animeData] = await Promise.all([
      getAllMovies(randomPage(), "popularity.desc", "all", "all", "movie"),
      getAllKDramas(randomPage(), "popularity.desc", "all", "all"),
      getAllAnime(randomPage(), "popularity.desc", "all", "all"),
    ]);

    const movie = pickFeatured(movieData, true);
    if (!movie) return { success: false, error: "No featured movie available from TMDB" };

    const ids: DailyPicksIds = {
      movie: movie.id,
      drama: pickFeatured(dramaData)?.id,
      anime: pickFeatured(animeData)?.id,
    };

    // Same titles in EN and FR (localized titles & synopses).
    const content = await loadDailyPicksContent(ids);
    if (!content) return { success: false, error: "Could not load the picks from TMDB" };

    const recipients = await getRecipients();
    const brevo = new BrevoClient({ apiKey });

    const results = await mapWithConcurrency(recipients, CONCURRENCY, (user) => {
      const email = renderDailyPicksEmail({
        locale: user.locale,
        content,
        firstName: user.firstName,
        domain,
        webVersionUrl: (l) => dailyPicksWebUrl(domain, ids, l),
        unsubscribeUrl: unsubscribeMailto,
      });
      return brevo.transactionalEmails.sendTransacEmail({
        subject: email.subject,
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: user.email, name: user.firstName || undefined }],
        htmlContent: email.html,
        textContent: email.text,
        tags: ["daily-picks", `daily-picks-${user.locale}`],
      });
    });

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      const reason = (failed[0] as PromiseRejectedResult).reason;
      console.error(
        `[daily-sync] ${failed.length}/${recipients.length} emails failed. First error:`,
        reason instanceof Error ? reason.message : reason,
      );
    }

    return {
      success: failed.length < recipients.length || recipients.length === 0,
      sent: recipients.length - failed.length,
      failed: failed.length,
    };
  } catch (error) {
    logFirebaseError("daily-sync", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}