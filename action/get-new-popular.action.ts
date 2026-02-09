"use server";

import { TMDBResponse } from "@/typing";

export async function getNewAndPopular(
  page: number = 1,
  genreId?: string,
  year?: string,
  display_lang?: string,
): Promise<TMDBResponse> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // We use popularity.desc as the primary driver for this specific page
  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&sort_by=popularity.desc&page=${page}&include_adult=true&vote_count.gte=100&language=${display_lang || "en-US"}`;

  if (genreId && genreId !== "all") {
    url += `&with_genres=${genreId}`;
  }

  if (year && year !== "All") {
    url += `&primary_release_year=${year}`;
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch Popular Library");

    const data: TMDBResponse = await res.json();
    return {
      ...data,
      results: data.results.filter((m) => m.poster_path !== null),
    };
  } catch (error) {
    console.error(error);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}
