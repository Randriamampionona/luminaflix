import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getSearchAnime(query: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/search/tv",
    { query, page, include_adult: true },
    { revalidate: REVALIDATE.default },
  );
  if (!data) return EMPTY_PAGE;
  const results = data.results.filter(
    (item) =>
      item.genre_ids?.includes(16) &&
      (item.origin_country?.includes("JP") || item.original_language === "ja"),
  );
  return { ...data, results, total_results: results.length };
}
