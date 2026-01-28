"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getSearchResults(
  query: string,
  genreId?: string,
): Promise<Movie[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    let url = "";

    // Build the URL based on the logic
    if (query && query.trim() !== "") {
      url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=true`;
    } else if (genreId && genreId !== "all") {
      url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`;
    } else {
      return [];
    }

    // Double check url is valid before fetching
    if (!url || url.includes("undefined")) {
      console.error("Lumina Auth Error: API Key or Base URL is missing.");
      return [];
    }

    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("TMDB API Error:", errorData);
      return [];
    }

    const data: TMDBResponse = await res.json();

    // Clean and filter results
    let results = data.results.filter(
      (item: any) => item.media_type !== "person",
    );

    // Manually filter by genre if a query was used (since /search/multi doesn't support with_genres)
    if (genreId && genreId !== "all" && query) {
      results = results.filter((movie) =>
        movie.genre_ids?.includes(parseInt(genreId)),
      );
    }

    return results || [];
  } catch (error) {
    console.error("Lumina Search Engine Critical Failure:", error);
    return [];
  }
}
