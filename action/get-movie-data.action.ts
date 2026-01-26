"use server";

export async function getMovieData(id: string) {
  const API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = process.env.BASE_URL;

  try {
    const res = await fetch(
      `${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=videos`,
      {
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
