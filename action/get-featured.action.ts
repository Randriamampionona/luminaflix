"use server";

import { Movie, TMDBResponse } from "@/typing";

export async function getFeatured({
  display_lang,
}: {
  display_lang?: string;
}): Promise<Movie | null> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(
      `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=${display_lang || "en-US"}&page=1`,
      { next: { revalidate: 60 } },
    );

    if (!res.ok) throw new Error("Failed to fetch Coup de Coeur");

    const data: TMDBResponse = await res.json();
    // We take the first one or you can do Math.random() * 5
    return data.results[0] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
