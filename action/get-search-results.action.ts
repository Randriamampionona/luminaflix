import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import { searchMoviesAndSeries } from "@/lib/search/tmdb-search";
import type { TMDBResponse } from "@/typing";

/**
 * Site-wide search (movies + series), paginated.
 * Uses /search/movie + /search/tv instead of /search/multi, so pages are
 * never emptied by "person" results (see lib/search/tmdb-search.ts).
 */
export async function getSearchResults(query: string, page = 1, genreId?: string): Promise<TMDBResponse> {
  const trimmed = query?.trim();
  const genre = genreId && genreId !== "all" ? Number(genreId) : null;
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), 500);

  if (trimmed) {
    const data = await searchMoviesAndSeries(trimmed, safePage);
    // The search endpoints have no genre filter, so apply it locally.
    return genre ? { ...data, results: data.results.filter((item) => item.genre_ids?.includes(genre)) } : data;
  }
  if (genre) {
    const data = await tmdb<TMDBResponse>(
      "/discover/movie",
      { sort_by: "popularity.desc", with_genres: genre, page: safePage },
      { revalidate: REVALIDATE.default },
    );
    return data ?? EMPTY_PAGE;
  }
  return EMPTY_PAGE;
}