"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getSearchResults(query: string): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  if (!query || query.trim() === "") return [];

  try {
    const res = await fetch(
      `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`,
      { next: { revalidate: 60 } }, // Short cache for search
    );

    if (!res.ok) return [];

    const data: TMDBResponse = await res.json();

    // Filter out people (TMDB 'multi' returns people, movies, and tv)
    return (
      data.results.filter((item: any) => item.media_type !== "person") || []
    );
  } catch (error) {
    console.error("Search Action Error:", error);
    return [];
  }
}
