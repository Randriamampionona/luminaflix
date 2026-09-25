import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getLatestMovies(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/movie/now_playing", { page: 1 }, { revalidate: REVALIDATE.short });
  return data?.results ?? [];
}
