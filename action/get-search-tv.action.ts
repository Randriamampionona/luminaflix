import { searchFilteredTv } from "@/lib/search/tmdb-search";
import type { Movie, TMDBResponse } from "@/typing";

/** Japanese animation has its own section (/anime). */
const isNotAnime = (item: Movie) =>
  !(item.genre_ids?.includes(16) && (item.original_language === "ja" || item.origin_country?.includes("JP")));

/**
 * TV-show search (series of any country, anime excluded). Reads several TMDB
 * pages per app page so each page is full after filtering.
 */
export async function getSearchTVShows(query: string, page = 1, chunk = 4): Promise<TMDBResponse> {
  return searchFilteredTv(query, page, isNotAnime, chunk);
}
