import { resolveSort } from "@/lib/filters";
import { EMPTY_PAGE, REVALIDATE, tmdb, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllAnime(
  page = 1,
  sortBy = "popularity.desc",
  genreId = "all",
  year = "all",
): Promise<TMDBResponse> {
  // Genre 16 = Animation; origin JP + original language ja narrows to anime.
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv", "popularity.desc"),
      page,
      with_genres: genreId !== "all" && /^\d+$/.test(genreId) ? genreId : "16",
      with_origin_country: "JP",
      with_original_language: "ja",
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
