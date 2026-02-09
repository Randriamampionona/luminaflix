"use server";

export async function getTrendingHero({
  display_lang,
}: {
  display_lang?: string;
}) {
  const API_KEY = process.env.TMDB_API_KEY!;
  const BASE_URL = process.env.BASE_URL!;

  try {
    const res = await fetch(
      `${BASE_URL}/trending/movie/day?api_key=${API_KEY}&language=${display_lang || "en-US"}`,
      { cache: "no-store" },
    );

    if (!res.ok) throw new Error("Failed to fetch trending movies");

    const data = await res.json();
    const movies = data.results;

    // Pick a random movie from the top 20 results
    const randomIndex = Math.floor(Math.random() * movies.length);
    return movies[randomIndex];
  } catch (error) {
    console.error(error);
    return null;
  }
}
