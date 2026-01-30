"use server";

import { TMDBResponse } from "@/typing";

export async function getMoviesByGenre(
  genreId: string,
  page: number = 1,
): Promise<TMDBResponse> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    // Added &page= parameter to the URL
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;

    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      return { results: [], total_pages: 0, total_results: 0, page: 1 };
    }

    return await res.json();
  } catch (error) {
    console.error("Lumina Genre Fetch Error:", error);
    return { results: [], total_pages: 0, total_results: 0, page: 1 };
  }
}
