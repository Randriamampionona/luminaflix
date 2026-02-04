"use server";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL;

export async function getSearchKDramas(query: string, page: number = 1) {
  try {
    const res = await fetch(
      `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
        query,
      )}&language=en-US&page=${page}&include_adult=true`,
      { next: { revalidate: 3600 } },
    );

    const data = await res.json();

    // Filter results to ensure they are Korean to maintain the "K-Drama" section integrity
    const filteredResults = data.results.filter(
      (item: any) =>
        item.origin_country?.includes("KR") || item.original_language === "ko",
    );

    return {
      ...data,
      results: filteredResults,
      total_results: filteredResults.length, // Simplified for search view
    };
  } catch (error) {
    console.error("Search Error:", error);
    return { results: [], total_pages: 0, total_results: 0 };
  }
}
