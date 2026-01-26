"use server";

import { TMDBResponse } from "@/typing";

export async function getLibrary(
  page: number = 1,
  sortBy: string = "vote_average.desc",
  genreId?: string,
): Promise<TMDBResponse> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // Library default: High rating, established films (vote_count > 500)
  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=${sortBy}&page=${page}&vote_count.gte=500&include_adult=true`;

  if (genreId && genreId !== "all") {
    url += `&with_genres=${genreId}`;
  }

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data: TMDBResponse = await res.json();
    return {
      ...data,
      results: data.results.filter((m) => m.poster_path !== null),
    };
  } catch (error) {
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}
