import "server-only";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export type DetailsType = "movie" | "tv";

interface Person {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
  department?: string;
}

export interface TitleDetails {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  origin_country?: string[];
  overview: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  last_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  vote_average: number;
  vote_count: number;
  budget?: number;
  revenue?: number;
  genres?: { id: number; name: string }[];
  production_companies?: { id: number; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  networks?: { id: number; name: string }[];
  created_by?: { id: number; name: string }[];
  credits?: { cast?: Person[]; crew?: Person[] };
  recommendations?: TMDBResponse;
  similar?: TMDBResponse;
}

/** Everything the details page shows, in one TMDB call (cached 1 h). */
export async function getTitleDetails(type: DetailsType, id: string) {
  if (!/^\d{1,9}$/.test(id)) return null;
  return tmdb<TitleDetails>(
    `/${type}/${id}`,
    { append_to_response: "credits,recommendations,similar" },
    { revalidate: REVALIDATE.default },
  );
}

/** "Same genre" row: popular titles of the main genre, without the title itself. */
export async function getSameGenre(type: DetailsType, genreId: number | undefined, excludeId: number) {
  if (!genreId) return [] as Movie[];
  const data = await tmdb<TMDBResponse>(
    `/discover/${type}`,
    { with_genres: genreId, sort_by: "popularity.desc", "vote_count.gte": 50, page: 1 },
    { revalidate: REVALIDATE.long },
  );
  return (data?.results ?? [])
    .filter((m) => m.id !== excludeId && m.poster_path)
    .slice(0, 18)
    .map((m) => ({ ...m, media_type: type }));
}
