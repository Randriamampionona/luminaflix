import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getTopRatedMovies(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/movie/top_rated", { page: 1 }, { revalidate: REVALIDATE.long });
  return data?.results ?? [];
}
