"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getLatestMovies({
  display_lang,
}: {
  display_lang?: string;
}): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(
      `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=${display_lang || "en-US"}&page=1`,
      { cache: "no-store" },
    );

    if (!res.ok) throw new Error("Failed to fetch latest movies");

    const data: TMDBResponse = await res.json();
    return data.results;
  } catch (error) {
    console.error(error);
    return [];
  }
}
