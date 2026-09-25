import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllTVShows(
  page = 1,
  sortBy?: string,
  genreId?: string,
  year?: string,
): Promise<TMDBResponse> {
  // BUG FIX: the URL previously contained "&&sort_by" and the year filter
  // compared against "All" while the UI could send other casings.
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv"),
      page,
      include_adult: true,
      "vote_count.gte": 50,
      ...genreParams(genreId),
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
