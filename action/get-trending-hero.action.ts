import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * Picks a random trending page so the hero changes between visits. Each page
 * is cached individually, so the randomness no longer costs an uncached
 * request on every page view.
 */
export async function getTrendingHero(): Promise<Movie[]> {
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const data = await tmdb<TMDBResponse>(
    "/trending/movie/day",
    { page: randomPage },
    { revalidate: REVALIDATE.short },
  );
  return (data?.results ?? []).filter((movie) => movie.backdrop_path);
}
