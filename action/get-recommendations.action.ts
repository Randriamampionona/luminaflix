"use server";

import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * TMDB recommendations for a title ("Because you watched …"), without the
 * ones that have no poster. Series results get `media_type: "tv"` so cards
 * open in the right section (K-Drama, Anime or TV Shows).
 */
export async function getRecommendations(kind: string, id: number | string): Promise<Movie[]> {
  if (!/^\d{1,9}$/.test(String(id))) return [];
  const isMovie = kind === "movie";
  const data = await tmdb<TMDBResponse>(`/${isMovie ? "movie" : "tv"}/${id}/recommendations`, { page: 1 }, {
    revalidate: REVALIDATE.long,
  });
  return (data?.results ?? [])
    .filter((m) => m.poster_path)
    .slice(0, 18)
    .map((m) => ({ ...m, media_type: m.media_type ?? (isMovie ? "movie" : "tv") }));
}
