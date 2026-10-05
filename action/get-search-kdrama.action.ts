import { searchFilteredTv } from "@/lib/search/tmdb-search";
import type { Movie, TMDBResponse } from "@/typing";

const isKorean = (item: Movie) => Boolean(item.origin_country?.includes("KR") || item.original_language === "ko");

/**
 * K-drama search (Korean series on TMDB). Reads several TMDB pages per app
 * page so each page is full after filtering. `chunk` = TMDB pages read.
 */
export async function getSearchKDramas(query: string, page = 1, chunk = 4): Promise<TMDBResponse> {
  return searchFilteredTv(query, page, isKorean, chunk);
}