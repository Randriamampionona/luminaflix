import type { Movie } from "@/typing";

/** Which section/route a title belongs to. */
export type MediaKind = "movie" | "tv" | "anime";

const BASE_ROUTE: Record<MediaKind, string> = {
  movie: "/movies",
  tv: "/k-drama", // generic TMDB TV route (episodes + player)
  anime: "/anime",
};

export function getDisplayTitle(item: Pick<Movie, "title" | "name">) {
  return item.title || item.name || "";
}

export function getReleaseYear(item: Pick<Movie, "release_date" | "first_air_date">) {
  return (item.release_date || item.first_air_date || "").split("-")[0] || "";
}

/** Infers the route kind for mixed results (e.g. /search/multi). */
export function inferMediaKind(item: Movie): MediaKind {
  const isTv = item.media_type === "tv" || (!item.title && !!item.name);
  if (!isTv) return "movie";
  const isAnime =
    item.genre_ids?.includes(16) &&
    (item.original_language === "ja" || item.origin_country?.includes("JP"));
  return isAnime ? "anime" : "tv";
}

export function getWatchHref(id: number | string, kind: MediaKind, title?: string) {
  const fallback = title ? `?fallback=${encodeURIComponent(title.toLowerCase())}` : "";
  return `${BASE_ROUTE[kind]}/${id}${fallback}`;
}

export function getTrailerHref(id: number | string, kind: MediaKind, title?: string) {
  // Trailer language defaults to the UI locale (see app/trailer/[id]).
  const params = new URLSearchParams({ type: kind });
  if (title) params.set("fallback", title.toLowerCase());
  return `/trailer/${id}?${params.toString()}`;
}

export const tmdbImage = (path?: string | null) =>
  path ? `https://image.tmdb.org/t/p/original${path}` : null;

/** Route params may or may not be URL-encoded; never throw on stray `%`. */
export function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
