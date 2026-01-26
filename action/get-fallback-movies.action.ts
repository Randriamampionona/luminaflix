"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getFallbackMovie(query: string): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL || "https://api.themoviedb.org/3";

  if (!query) return [];

  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`,
      { next: { revalidate: 3600 } },
    );

    if (!res.ok) return [];

    const data: TMDBResponse = await res.json();
    return data.results || []; // Always return an array
  } catch (error) {
    console.error("Fallback search error:", error);
    return []; // Return empty array on catch
  }
}
