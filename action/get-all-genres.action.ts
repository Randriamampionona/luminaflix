"use server";

import { Genre } from "@/typing";

export async function getAllGenres({
  display_lang,
}: {
  display_lang?: string;
}): Promise<(Genre & { backdrop?: string })[]> {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const [movieRes, tvRes] = await Promise.all([
      fetch(
        `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      ),
      fetch(
        `${BASE_URL}/genre/tv/list?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      ),
    ]);

    const movieData = await movieRes.json();
    const tvData = await tvRes.json();

    const uniqueGenresMap = new Map();
    [...movieData.genres, ...tvData.genres].forEach((genre) => {
      uniqueGenresMap.set(genre.id, genre);
    });

    const genres = Array.from(uniqueGenresMap.values());

    // PRO STEP: Fetch a backdrop for each genre
    const genresWithImages = await Promise.all(
      genres.map(async (genre) => {
        const discoverRes = await fetch(
          `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genre.id}&sort_by=popularity.desc&include_adult=true&page=1`,
        );
        const discoverData = await discoverRes.json();
        return {
          ...genre,
          backdrop: discoverData.results?.[0]?.backdrop_path || null,
        };
      }),
    );

    return genresWithImages.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Lumina Archive Error:", error);
    return [];
  }
}
