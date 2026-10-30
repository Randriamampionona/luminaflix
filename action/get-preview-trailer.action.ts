"use server";

import { getMovieTrailer } from "@/action/get-movie-trailer.action";

/** YouTube key of a title's trailer, for the hover preview on cards (cached by the TMDB layer). */
export async function getPreviewTrailer(id: number, kind: string): Promise<string | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const trailer = await getMovieTrailer(String(id), undefined, kind === "movie" ? "movie" : "tv").catch(() => null);
  return trailer?.key ?? null;
}
