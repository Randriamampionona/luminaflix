"use server";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL;

export async function getAnimeDetails(id: string, display_lang?: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${id}?api_key=${API_KEY}&append_to_response=videos,credits,recommendations&language=${display_lang || "en-US"}`,
      { next: { revalidate: 3600 } }, // Cache details for 1 hour
    );

    if (!res.ok) throw new Error("Anime details not found");

    return await res.json();
  } catch (error) {
    console.error("Error fetching anime details:", error);
    return null;
  }
}

/**
 * Fetches episodes for a specific season of the Anime
 */
export async function getAnimeSeasonEpisodes(
  seriesId: string,
  seasonNumber: number,
  display_lang?: string,
) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok)
      throw new Error(`Failed to fetch Season ${seasonNumber} episodes`);

    const data = await res.json();
    return data.episodes || [];
  } catch (error) {
    console.error(`Error fetching episodes for season ${seasonNumber}:`, error);
    return [];
  }
}
