import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/** "Coup de coeur": the best rated title that has a backdrop. */
export async function getFeatured(): Promise<Movie | null> {
  const data = await tmdb<TMDBResponse>("/movie/top_rated", { page: 1 }, { revalidate: REVALIDATE.long });
  return data?.results.find((movie) => movie.backdrop_path) ?? null;
}
