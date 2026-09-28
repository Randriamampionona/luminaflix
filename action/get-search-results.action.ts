import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

/**
 * Site-wide search (movies + series).
 *
 * BUG FIX: TMDB search is paginated — 20 results per page — and only page 1
 * was ever requested, with people then filtered out (hence "19–20 results"
 * even for "marvel"). The page number is now passed through and TMDB's real
 * totals are returned so the results page can paginate.
 */
export async function getSearchResults(query: string, page = 1, genreId?: string): Promise<TMDBResponse> {
  const trimmed = query?.trim();
  const genre = genreId && genreId !== "all" ? Number(genreId) : null;
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), 500);

  let data: TMDBResponse | null = null;
  if (trimmed) {
    data = await tmdb<TMDBResponse>(
      "/search/multi",
      { query: trimmed, include_adult: true, page: safePage },
      { revalidate: REVALIDATE.default },
    );
  } else if (genre) {
    data = await tmdb<TMDBResponse>(
      "/discover/movie",
      { sort_by: "popularity.desc", with_genres: genre, page: safePage },
      { revalidate: REVALIDATE.default },
    );
  }
  if (!data) return EMPTY_PAGE;

  // Multi-search also returns people: keep movies and series only.
  let results = (data.results ?? []).filter((item) => item.media_type !== "person");
  // /search/multi has no genre filter, so apply it locally.
  if (trimmed && genre) results = results.filter((item) => item.genre_ids?.includes(genre));

  return {
    page: data.page ?? safePage,
    results,
    total_pages: Math.min(data.total_pages ?? 1, 500),
    total_results: data.total_results ?? results.length,
  };
}
