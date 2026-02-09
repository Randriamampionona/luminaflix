"use server";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL;

export async function getKDramaDetails(id: string, display_lang?: string) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getSeasonEpisodes(
  seriesId: string,
  seasonNumber: number,
  display_lang?: string,
) {
  try {
    const res = await fetch(
      `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.episodes || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
