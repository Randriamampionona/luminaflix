"use server";

export async function getTrendingHero({
  display_lang,
}: {
  display_lang?: string;
}) {
  const API_KEY = process.env.TMDB_API_KEY!;
  const BASE_URL = process.env.BASE_URL!;

  // Generate a random page between 1 and 100
  const randomPage = Math.floor(Math.random() * 100) + 1;

  try {
    const res = await fetch(
      `${BASE_URL}/trending/movie/day?api_key=${API_KEY}&page=${randomPage}&language=${display_lang || "en-US"}`,
      { cache: "no-store" }, // Ensures a new random page on every request
    );

    if (!res.ok) throw new Error("Failed to fetch trending movies");

    const data = await res.json();

    // Return the results array
    return data.results;
  } catch (error) {
    console.error("Lumina_Core_Error:", error);
    return [];
  }
}
