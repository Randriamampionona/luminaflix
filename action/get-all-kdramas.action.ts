"use server";

import { TMDBResponse } from "@/typing";

export async function getAllKDramas(
  page: number = 1,
  sortBy: string = "popularity.desc",
  genreId: string = "all",
  year: string = "All",
  display_lang?: string,
) {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // Build filters
  const genreFilter = genreId !== "all" ? `&with_genres=${genreId}` : "";
  const yearFilter = year !== "All" ? `&first_air_date_year=${year}` : "";

  try {
    const res = await fetch(
      `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=${sortBy}&page=${page}${genreFilter}${yearFilter}&with_original_language=ko&with_origin_country=KR&language=${display_lang || "en-US"}`,
      { cache: "no-store" },
    );

    if (!res.ok) throw new Error("Failed to fetch K-Dramas");

    const data: TMDBResponse = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return { results: [], total_pages: 0, total_results: 0, page: 1 };
  }
}
