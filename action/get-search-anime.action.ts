"use server";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL;

export async function getSearchAnime(
  query: string,
  page: number = 1,
  display_lang?: string,
) {
  try {
    const res = await fetch(
      `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
        query,
      )}&language=${display_lang || "en-US"}&page=${page}&include_adult=true`,
      { cache: "no-store" },
    );

    const data = await res.json();

    // Filter results to ensure they are Anime (Animation + Japanese origin)
    const filteredResults = data.results.filter(
      (item: any) =>
        item.genre_ids?.includes(16) &&
        (item.origin_country?.includes("JP") ||
          item.original_language === "ja"),
    );

    return {
      ...data,
      results: filteredResults,
      total_results: filteredResults.length,
    };
  } catch (error) {
    console.error("Anime Search Error:", error);
    return { results: [], total_pages: 0, total_results: 0 };
  }
}
