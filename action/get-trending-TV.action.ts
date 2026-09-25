import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getTrendingTV(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/trending/tv/week", {}, { revalidate: REVALIDATE.short });
  return data?.results.slice(0, 10) ?? [];
}
