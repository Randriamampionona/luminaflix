import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getNewAndPopular(
  page = 1,
  genreId?: string,
  year?: string,
): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    {
      sort_by: "popularity.desc",
      page,
      include_adult: true,
      "vote_count.gte": 100,
      ...genreParams(genreId),
      ...yearParams(year, "movie"),
    },
    { revalidate: REVALIDATE.short },
  );
  return withPosters(data);
}
