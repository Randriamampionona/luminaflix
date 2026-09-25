import "server-only";
import { locales, localeMeta, type Locale } from "@/i18n/config";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie } from "@/typing";
import type { DailyPick, DailyPicksContent } from "./daily-picks-email";

export interface DailyPicksIds {
  movie: number | string;
  drama?: number | string | null;
  anime?: number | string | null;
}

type Kind = DailyPick["kind"];

const detailPath = (kind: Kind, id: number | string) => (kind === "movie" ? `/movie/${id}` : `/tv/${id}`);

/** One title in every language, with English as fallback for missing translations. */
async function loadPick(kind: Kind, id: number | string): Promise<Record<Locale, DailyPick> | null> {
  const results = await Promise.all(
    locales.map((locale) =>
      tmdb<Movie>(
        detailPath(kind, id),
        { language: localeMeta[locale].tmdb },
        { revalidate: REVALIDATE.default, localized: false },
      ),
    ),
  );
  const byLocale = Object.fromEntries(locales.map((l, i) => [l, results[i]])) as Record<Locale, Movie | null>;
  const base = byLocale.en ?? Object.values(byLocale).find(Boolean);
  if (!base) return null;

  return Object.fromEntries(
    locales.map((locale) => {
      const localized = byLocale[locale];
      const item: Movie = {
        ...base,
        ...localized,
        // TMDB returns "" when a translation is missing.
        title: localized?.title || base.title,
        name: localized?.name || base.name,
        overview: localized?.overview || base.overview,
      };
      return [locale, { item, kind }];
    }),
  ) as Record<Locale, DailyPick>;
}

/**
 * Loads the picks in every supported language. Used by the daily cron and
 * by the hosted web version (app/email/daily-picks/route.ts), so both show
 * exactly the same titles.
 */
export async function loadDailyPicksContent(ids: DailyPicksIds): Promise<DailyPicksContent | null> {
  const [hero, drama, anime] = await Promise.all([
    loadPick("movie", ids.movie),
    ids.drama ? loadPick("k-drama", ids.drama) : Promise.resolve(null),
    ids.anime ? loadPick("anime", ids.anime) : Promise.resolve(null),
  ]);
  if (!hero) return null;

  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        hero: hero[locale],
        more: [drama?.[locale], anime?.[locale]].filter((p): p is DailyPick => Boolean(p)),
      },
    ]),
  ) as DailyPicksContent;
}

/** Link to the hosted copy of this email (web version + fallback language switch). */
export function dailyPicksWebUrl(domain: string, ids: DailyPicksIds, locale: Locale) {
  const url = new URL("/email/daily-picks", domain);
  url.searchParams.set("m", String(ids.movie));
  if (ids.drama) url.searchParams.set("d", String(ids.drama));
  if (ids.anime) url.searchParams.set("a", String(ids.anime));
  url.searchParams.set("lang", locale);
  return url.toString();
}

export function unsubscribeMailto(locale: Locale) {
  const to = process.env.CONTACT_TO_EMAIL || "tojorandria474@gmail.com";
  const subject = locale === "fr" ? "Désabonnement de la sélection du jour" : "Unsubscribe from daily picks";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}`;
}