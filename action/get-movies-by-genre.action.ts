import { EMPTY_PAGE, REVALIDATE, genreParams, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getMoviesByGenre(genreId: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    { sort_by: "popularity.desc", page, ...genreParams(genreId) },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
