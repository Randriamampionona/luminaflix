/** Shared between the admin API and the /media-infos page. */
export type InfoKind = "movie" | "anime" | "kdrama";

export interface MediaInfo {
  kind: InfoKind;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  originalTitle: string | null;
  tagline: string | null;
  overview: string | null;
  year: string | null;
  releaseDate: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;
  votes: number;
  /** Movie: runtime in minutes; series: typical episode length. */
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  status: string | null;
  genres: string[];
  languages: string[];
  countries: string[];
  cast: { name: string; character: string | null; profilePath: string | null }[];
  /** Public pages on LuminaFlix. */
  pagePath: string;
  playerPath: string;
}

/**
 * Accepts what people paste: a TMDB id ("1630409"), an IMDb id ("tt0111161"),
 * or a TMDB / IMDb URL. Returns null when nothing usable is found.
 */
export function parseMediaId(input: string): { imdbId: string } | { tmdbId: number } | null {
  const value = input.trim();
  const imdb = value.match(/tt\d{5,10}/i);
  if (imdb) return { imdbId: imdb[0].toLowerCase() };
  const tmdbUrl = value.match(/themoviedb\.org\/(?:movie|tv)\/(\d+)/i);
  if (tmdbUrl) return { tmdbId: Number(tmdbUrl[1]) };
  if (/^\d{1,9}$/.test(value)) return { tmdbId: Number(value) };
  return null;
}
