import "server-only";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/** Mostly Latin letters (French / English titles): skips untranslated titles like "부활남". */
const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]+$/u;

/**
 * Home hero: today's most popular movies (TMDB trending, pages 1–2), keeping
 * only the ones that look good in the hero — a backdrop, a translated title
 * and a summary — each with its real trending rank (#1, #2…).
 */
export async function getTrendingHero(): Promise<(Movie & { rank: number })[]> {
  const pages = await Promise.all(
    [1, 2].map((page) => tmdb<TMDBResponse>("/trending/movie/day", { page }, { revalidate: REVALIDATE.short })),
  );
  return pages
    .flatMap((p) => p?.results ?? [])
    .map((movie, index) => ({ ...movie, rank: index + 1 }))
    .filter(
      (movie) =>
        movie.backdrop_path &&
        movie.poster_path &&
        (movie.overview ?? "").trim().length > 40 &&
        LATIN.test(movie.title ?? movie.name ?? ""),
    );
}
