import { searchFilteredTv } from "@/lib/search/tmdb-search";
import type { Movie, TMDBResponse } from "@/typing";

const isAnime = (item: Movie) =>
  Boolean(item.genre_ids?.includes(16) && (item.origin_country?.includes("JP") || item.original_language === "ja"));

/**
 * Anime search (Japanese animation on TMDB). Reads several TMDB pages per
 * app page so each page is full after filtering. `chunk` = TMDB pages read.
 */
export async function getSearchAnime(query: string, page = 1, chunk = 4): Promise<TMDBResponse> {
  return searchFilteredTv(query, page, isAnime, chunk);
}