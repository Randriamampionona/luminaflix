import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Genre, GenreResponse, TMDBResponse } from "@/typing";

/** Movie + TV genres merged and de-duplicated (cached for a day). */
export async function getGenreList(): Promise<Genre[]> {
  const [movie, tv] = await Promise.all([
    tmdb<GenreResponse>("/genre/movie/list", {}, { revalidate: REVALIDATE.long }),
    tmdb<GenreResponse>("/genre/tv/list", {}, { revalidate: REVALIDATE.long }),
  ]);
  const unique = new Map<number, Genre>();
  for (const genre of [...(movie?.genres ?? []), ...(tv?.genres ?? [])]) {
    unique.set(genre.id, genre);
  }
  return [...unique.values()];
}

/**
 * PERF: /genres/[id] used to call getAllGenres() — ~27 uncached discover
 * requests — only to print one genre name. This reads the cached list.
 */
export async function getGenreName(id: string): Promise<string | null> {
  const genres = await getGenreList();
  return genres.find((genre) => String(genre.id) === id)?.name ?? null;
}

export async function getAllGenres(): Promise<(Genre & { backdrop: string | null })[]> {
  const genres = await getGenreList();

  // One backdrop per genre. The artwork doesn't depend on the language, so
  // it is fetched unlocalized and cached for a day across all users.
  const withImages = await Promise.all(
    genres.map(async (genre) => {
      const discover = await tmdb<TMDBResponse>(
        "/discover/movie",
        { with_genres: genre.id, sort_by: "popularity.desc", page: 1 },
        { revalidate: REVALIDATE.long, localized: false },
      );
      return { ...genre, backdrop: discover?.results?.[0]?.backdrop_path ?? null };
    }),
  );

  return withImages.sort((a, b) => a.name.localeCompare(b.name));
}
