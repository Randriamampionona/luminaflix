"use server";

import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { AnimeEpisode } from "@/typing";

export interface SeriesDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  origin_country?: string[];
  first_air_date?: string;
  number_of_seasons?: number;
  genres?: { id: number; name: string }[];
  seasons: { id: number; season_number: number; name: string; episode_count: number }[];
}

const isId = (value: string) => /^\d+$/.test(value);

export async function getKDramaDetails(id: string) {
  if (!isId(id)) return null;
  return tmdb<SeriesDetails>(`/tv/${id}`, {}, { revalidate: REVALIDATE.default });
}

/**
 * Called from <EpisodeExplorer /> (client) when switching seasons — this is
 * why the module stays a server action. The language follows the user's
 * locale cookie automatically.
 */
export async function getSeasonEpisodes(
  seriesId: string,
  seasonNumber: number,
): Promise<AnimeEpisode[]> {
  if (!isId(seriesId) || !Number.isInteger(seasonNumber) || seasonNumber < 0) return [];
  const data = await tmdb<{ episodes?: AnimeEpisode[] }>(
    `/tv/${seriesId}/season/${seasonNumber}`,
    {},
    { revalidate: REVALIDATE.default },
  );
  return data?.episodes ?? [];
}
