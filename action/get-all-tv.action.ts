"use server";

import { TMDBResponse } from "@/typing";

export async function getAllTVShows(
  page: number = 1,
  sortBy: string = "first_air_date.desc",
  genreId?: string,
  year?: string,
  display_lang?: string,
): Promise<TMDBResponse> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // TMDb TV Sort keys: first_air_date.desc, popularity.desc, vote_average.desc
  let url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&&sort_by=${sortBy}&page=${page}&include_adult=true&vote_count.gte=50&language=${display_lang || "en-US"}`;

  if (genreId && genreId !== "all") {
    url += `&with_genres=${genreId}`;
  }

  if (year && year !== "All") {
    url += `&first_air_date_year=${year}`;
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch TV Library");

    const data: TMDBResponse = await res.json();
    return {
      ...data,
      results: data.results.filter((show) => show.poster_path !== null),
    };
  } catch (error) {
    console.error(error);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}
