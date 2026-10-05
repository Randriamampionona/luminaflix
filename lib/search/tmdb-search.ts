import "server-only";
import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * TMDB search helpers that always fill a results page.
 *
 * BUG FIX (pagination yield): pages could show 2 cards out of 20 because
 * results were filtered *after* fetching a single TMDB page:
 * - site search used /search/multi and dropped people (often most of a page);
 * - anime / K-drama search used /search/tv and kept only Japanese animation /
 *   Korean shows, which can be 1–3 items per TMDB page for common words.
 */

const MAX_TMDB_PAGES = 500;
const options = { revalidate: REVALIDATE.default };

const byPopularity = (a: Movie, b: Movie) => (b.popularity ?? 0) - (a.popularity ?? 0);

/**
 * Movies + series for one app page: /search/movie and /search/tv (page N of
 * each, 20 + 20 items, no people), merged by popularity. Totals are exact.
 */
export async function searchMoviesAndSeries(query: string, page: number): Promise<TMDBResponse> {
  const [movies, series] = await Promise.all([
    tmdb<TMDBResponse>("/search/movie", { query, page, include_adult: true }, options),
    tmdb<TMDBResponse>("/search/tv", { query, page, include_adult: true }, options),
  ]);
  if (!movies && !series) return EMPTY_PAGE;

  const tag = (items: Movie[] | undefined, mediaType: "movie" | "tv") =>
    (items ?? []).map((item) => ({ ...item, media_type: mediaType }));
  const results = [...tag(movies?.results, "movie"), ...tag(series?.results, "tv")].sort(byPopularity);

  return {
    page,
    results,
    total_pages: Math.min(Math.max(movies?.total_pages ?? 0, series?.total_pages ?? 0), MAX_TMDB_PAGES),
    total_results: (movies?.total_results ?? 0) + (series?.total_results ?? 0),
  };
}

/**
 * Filtered TV search (anime, K-drama). Each app page reads `chunk` TMDB pages
 * (pages (N-1)·chunk+1 … N·chunk) and keeps the matching shows, so a page is
 * built from up to 20·chunk candidates instead of 20.
 *
 * The total is exact when every TMDB page was read, otherwise estimated from
 * the share of matching shows (flagged with `approximate_total`).
 */
export async function searchFilteredTv(
  query: string,
  page: number,
  keep: (item: Movie) => boolean,
  chunk = 4,
): Promise<TMDBResponse> {
  const firstPage = (page - 1) * chunk + 1;
  const first = await tmdb<TMDBResponse>("/search/tv", { query, page: firstPage, include_adult: true }, options);
  if (!first) return EMPTY_PAGE;

  const tmdbPages = Math.min(first.total_pages ?? 1, MAX_TMDB_PAGES);
  const lastPage = Math.min(firstPage + chunk - 1, tmdbPages);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, lastPage - firstPage) }, (_, i) =>
      tmdb<TMDBResponse>("/search/tv", { query, page: firstPage + 1 + i, include_adult: true }, options),
    ),
  );

  const raw = [first, ...rest].flatMap((p) => p?.results ?? []);
  const seen = new Set<number>();
  const results = raw
    .filter(keep)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .map((item) => ({ ...item, media_type: "tv" as const }));

  const readEverything = tmdbPages <= chunk;
  const ratio = raw.length > 0 ? results.length / raw.length : 0;

  return {
    page,
    results,
    total_pages: Math.max(1, Math.ceil(tmdbPages / chunk)),
    total_results: readEverything ? results.length : Math.round((first.total_results ?? 0) * ratio),
    approximate_total: !readEverything,
  };
}