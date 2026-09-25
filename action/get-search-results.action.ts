import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getSearchResults(query: string, genreId?: string): Promise<Movie[]> {
  const trimmed = query?.trim();
  const genre = genreId && genreId !== "all" ? Number(genreId) : null;

  let data: TMDBResponse | null = null;
  if (trimmed) {
    data = await tmdb<TMDBResponse>(
      "/search/multi",
      { query: trimmed, include_adult: true },
      { revalidate: REVALIDATE.default },
    );
  } else if (genre) {
    // BUG FIX: the genre was previously commented out of this request.
    data = await tmdb<TMDBResponse>(
      "/discover/movie",
      { sort_by: "popularity.desc", with_genres: genre },
      { revalidate: REVALIDATE.default },
    );
  } else {
    return [];
  }

  let results = (data?.results ?? []).filter((item) => item.media_type !== "person");
  // /search/multi has no genre filter, so apply it locally.
  if (trimmed && genre) results = results.filter((item) => item.genre_ids?.includes(genre));
  return results;
}
