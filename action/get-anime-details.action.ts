import { getKDramaDetails, getSeasonEpisodes } from "./get-kdrama-details.action";

// Anime are TMDB TV series: same endpoints as the generic series details.
export async function getAnimeDetails(id: string) {
  return getKDramaDetails(id);
}

export async function getAnimeSeasonEpisodes(seriesId: string, seasonNumber: number) {
  return getSeasonEpisodes(seriesId, seasonNumber);
}
