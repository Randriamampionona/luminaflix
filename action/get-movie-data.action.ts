"use server";

export async function getMovieData(id: string) {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    // We append external_ids to the response to get the IMDB ID directly
    const res = await fetch(
      `${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=videos,external_ids`,
      {
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Lumina Fetch Error:", error);
    return null;
  }
}
