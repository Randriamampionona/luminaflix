"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getTrendingTV({
  display_lang,
}: {
  display_lang?: string;
}): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(
      `${BASE_URL}/trending/tv/week?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      { cache: "no-store" },
    );

    if (!res.ok) throw new Error("Failed to fetch trending TV");

    const data: TMDBResponse = await res.json();
    // Return only the top 10 as requested
    return data.results.slice(0, 10);
  } catch (error) {
    console.error(error);
    return [];
  }
}
