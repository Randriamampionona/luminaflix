"use server";

import { TMDBResponse } from "@/typing";

export async function getAllMovies(
  page: number = 1,
  sortBy: string = "primary_release_date.desc",
  genreId?: string,
  year?: string,
  type: string = "movie", // Default to movie as per your /movies route
): Promise<TMDBResponse> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // TMDb uses different endpoints for Movies vs TV
  const endpoint = type === "tv" ? "tv" : "movie";
  let url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&sort_by=${sortBy}&page=${page}&include_adult=true&vote_count.gte=50`;

  if (genreId && genreId !== "all") url += `&with_genres=${genreId}`;
  if (year && year !== "all") {
    // Use primary_release_year for movies, first_air_date_year for TV
    const yearParam =
      type === "tv" ? "first_air_date_year" : "primary_release_year";
    url += `&${yearParam}=${year}`;
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
