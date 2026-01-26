"use server";

import { Genre, GenreResponse, TMDBResponse } from "@/typing";

export async function getGenres(): Promise<
  (Genre & { count: number; poster: string })[]
> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}`);
    const data: GenreResponse = await res.json();

    // Process the first 5 genres
    const genresWithData = await Promise.all(
      data.genres.slice(0, 5).map(async (genre) => {
        const discoverRes = await fetch(
          `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}`,
          { next: { revalidate: 86400 } },
        );
        const discoverData: TMDBResponse = await discoverRes.json();

        return {
          ...genre,
          count: discoverData.total_results, // The 1251 count from your UI
          poster: discoverData.results[0]?.poster_path || "", // The image from your UI
        };
      }),
    );

    return genresWithData;
  } catch (error) {
    console.error(error);
    return [];
  }
}
