import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllMovies(
  page = 1,
  sortBy?: string,
  genreId?: string,
  year?: string,
  type: "movie" | "tv" = "movie",
): Promise<TMDBResponse> {
  const endpoint = type === "tv" ? "tv" : "movie";
  const data = await tmdb<TMDBResponse>(
    `/discover/${endpoint}`,
    {
      sort_by: resolveSort(sortBy, endpoint),
      page,
      include_adult: true,
      "vote_count.gte": 50,
      ...genreParams(genreId),
      ...yearParams(year, endpoint),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
