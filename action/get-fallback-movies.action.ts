"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getFallbackMovie(
  query: string,
  display_lang?: string,
): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  if (!query) return [];

  try {
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=1&language=${display_lang || "en-US"}`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) return [];

    const data: TMDBResponse = await res.json();
    return data.results || []; // Always return an array
  } catch (error) {
    console.error("Fallback search error:", error);
    return []; // Return empty array on catch
  }
}
