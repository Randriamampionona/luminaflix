"use server";

import { TMDBResponse } from "@/typing";

export async function getAllAnime(
  page: number = 1,
  sortBy: string = "popularity.desc",
  genreId: string = "all", // You can pass specific anime sub-genres here if needed
  year: string = "All"
) {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  // Build filters
  // Note: Genre 16 is 'Animation'. To ensure it's Anime, we filter by Japan (JP)
  const genreFilter =
    genreId !== "all" ? `&with_genres=${genreId}` : "&with_genres=16";
  const yearFilter = year !== "All" ? `&first_air_date_year=${year}` : "";

  try {
    const res = await fetch(
      `${BASE_URL}/discover/tv?api_key=${API_KEY}&sort_by=${sortBy}&page=${page}${genreFilter}${yearFilter}&with_origin_country=JP&with_original_language=ja`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error("Failed to fetch Anime");

    const data: TMDBResponse = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return { results: [], total_pages: 0, total_results: 0, page: 1 };
  }
}
