import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getSearchKDramas(query: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/search/tv",
    { query, page, include_adult: true },
    { revalidate: REVALIDATE.default },
  );
  if (!data) return EMPTY_PAGE;
  const results = data.results.filter(
    (item) => item.origin_country?.includes("KR") || item.original_language === "ko",
  );
  return { ...data, results, total_results: results.length };
}
