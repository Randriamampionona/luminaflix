import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getLibrary(
  page = 1,
  sortBy = "vote_average.desc",
  genreId?: string,
): Promise<TMDBResponse> {
  // Library = well-established films (500+ votes).
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    {
      sort_by: resolveSort(sortBy, "movie", "vote_average.desc"),
      page,
      "vote_count.gte": 500,
      include_adult: true,
      ...genreParams(genreId),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
