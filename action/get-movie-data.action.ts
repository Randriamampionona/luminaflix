import { REVALIDATE, tmdb } from "@/lib/tmdb";

interface MovieDetails {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  genres?: { id: number; name: string }[];
  external_ids?: { imdb_id?: string | null };
}

export async function getMovieData(id: string) {
  if (!/^\d+$/.test(id)) return null;
  return tmdb<MovieDetails>(
    `/movie/${id}`,
    { append_to_response: "external_ids" },
    { revalidate: REVALIDATE.default },
  );
}
