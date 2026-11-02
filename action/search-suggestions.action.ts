"use server";

import { inferMediaKind } from "@/lib/media";
import { searchMoviesAndSeries } from "@/lib/search/tmdb-search";
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/** One line of the instant results / trending list of the search. */
export interface SearchSuggestion {
  id: number;
  title: string;
  year: string | null;
  poster: string | null;
  rating: number;
  kind: "movie" | "tv" | "kdrama" | "anime";
}

const toSuggestion = (m: Movie): SearchSuggestion => ({
  id: m.id,
  title: m.title || m.name || "",
  year: (m.release_date || m.first_air_date || "").slice(0, 4) || null,
  poster: m.poster_path ?? null,
  rating: m.vote_average ?? 0,
  kind: inferMediaKind(m),
});

/** Instant results while typing (movies + series, best first, max 6). Cached by the TMDB layer. */
export async function getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const q = String(query ?? "")
    .trim()
    .slice(0, 100);
  if (q.length < 2) return [];
  const data = await searchMoviesAndSeries(q, 1).catch(() => null);
  return (data?.results ?? [])
    .filter((m) => m.poster_path && (m.title || m.name))
    .slice(0, 6)
    .map(toSuggestion);
}

/** "Trending now" in the search (today's most popular movies and series). Cached 1 h. */
export async function getTrendingSearches(): Promise<SearchSuggestion[]> {
  const data = await tmdb<TMDBResponse>("/trending/all/day", {}, { revalidate: REVALIDATE.default });
  return (data?.results ?? [])
    .filter((m) => (m.media_type === "movie" || m.media_type === "tv") && m.poster_path)
    .slice(0, 10)
    .map(toSuggestion);
}
