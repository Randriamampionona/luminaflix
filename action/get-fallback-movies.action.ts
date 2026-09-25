import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getFallbackMovie(query: string): Promise<Movie[]> {
  if (!query) return [];
  const data = await tmdb<TMDBResponse>("/search/movie", { query, page: 1 }, { revalidate: REVALIDATE.default });
  return data?.results ?? [];
}
