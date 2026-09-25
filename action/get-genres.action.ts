import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Genre, GenreResponse, TMDBResponse } from "@/typing";

export type GenreWithStats = Genre & { count: number; poster: string };

/** Home page genre tiles: name + title count + a representative poster. */
export async function getGenres(limit = 5): Promise<GenreWithStats[]> {
  const data = await tmdb<GenreResponse>("/genre/movie/list", {}, { revalidate: REVALIDATE.long });
  if (!data?.genres) return [];

  return Promise.all(
    data.genres.slice(0, limit).map(async (genre) => {
      const discover = await tmdb<TMDBResponse>(
        "/discover/movie",
        { with_genres: genre.id },
        { revalidate: REVALIDATE.long, localized: false },
      );
      return {
        ...genre,
        count: discover?.total_results ?? 0,
        poster: discover?.results[0]?.poster_path ?? "",
      };
    }),
  );
}
