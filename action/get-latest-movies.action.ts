"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getLatestMovies(): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(
      `${BASE_URL}/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) throw new Error("Failed to fetch latest movies");

    const data: TMDBResponse = await res.json();
    return data.results;
  } catch (error) {
    console.error(error);
    return [];
  }
}
