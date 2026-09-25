import { resolveSort } from "@/lib/filters";
import { EMPTY_PAGE, REVALIDATE, genreParams, tmdb, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllKDramas(
  page = 1,
  sortBy = "popularity.desc",
  genreId = "all",
  year = "all",
): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv", "popularity.desc"),
      page,
      with_original_language: "ko",
      with_origin_country: "KR",
      ...genreParams(genreId),
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
