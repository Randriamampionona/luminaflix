"use server";

import { TMDBResponse } from "@/typing";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL;

// Get the main drama details (including all seasons)
export async function getKDramaDetails(id: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } },
    );
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Get episodes for a specific season
export async function getSeasonEpisodes(
  seriesId: string,
  seasonNumber: number,
) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=en-US`,
      { next: { revalidate: 3600 } },
    );
    const data = await res.json();
    return data.episodes;
  } catch (error) {
    console.error(error);
    return [];
  }
}
