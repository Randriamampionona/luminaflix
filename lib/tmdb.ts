import "server-only";
import { getLocale } from "next-intl/server";
import { localeMeta } from "@/i18n/config";
import type { TMDBResponse } from "@/typing";
import { OLDER_THAN_YEAR, type MediaType } from "./filters";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = (
  process.env.BASE_URL || "https://api.themoviedb.org/3"
).replace(/\/$/, "");

/** Revalidation windows (seconds) for the Next.js data cache. */
export const REVALIDATE = {
  /** Trending / "now playing" style lists. */
  short: 60 * 15,
  /** Discover lists, search, details. */
  default: 60 * 60,
  /** Genre lists and other near-static data. */
  long: 60 * 60 * 24,
} as const;

export const EMPTY_PAGE: TMDBResponse = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

type Params = Record<string, string | number | boolean | null | undefined>;

interface TmdbOptions {
  /** Seconds to keep the response in the data cache (0 = no cache). */
  revalidate?: number;
  /** Adds the current locale as `language` (default: true). */
  localized?: boolean;
}

/** TMDB `language` value for the current request's locale. */
async function getTmdbLanguage(): Promise<string> {
  const locale = await getLocale();
  return localeMeta[locale]?.tmdb ?? "en-US";
}

/**
 * Single entry point for TMDB. Handles URL building, locale, caching and
 * error normalisation (returns `null` instead of throwing, so one failed
 * row never takes a whole page down).
 */
export async function tmdb<T>(
  path: string,
  params: Params = {},
  { revalidate = REVALIDATE.default, localized = true }: TmdbOptions = {},
): Promise<T | null> {
  if (!API_KEY) {
    console.error("[tmdb] TMDB_API_KEY is not set");
    return null;
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  if (localized) url.searchParams.set("language", await getTmdbLanguage());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  try {
    const res = await fetch(
      url,
      revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" },
    );
    if (!res.ok) {
      console.error(`[tmdb] ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`[tmdb] request failed on ${path}`, error);
    return null;
  }
}

/** Normalises a paginated response and drops entries without artwork. */
export function withPosters(data: TMDBResponse | null): TMDBResponse {
  if (!data?.results) return EMPTY_PAGE;
  return { ...data, results: data.results.filter((item) => item.poster_path) };
}

/** Year filter → TMDB params. Handles "all", "older" and 4-digit years. */
export function yearParams(year: string | undefined, type: MediaType): Params {
  const value = year?.toLowerCase();
  if (!value || value === "all") return {};
  if (value === "older") {
    const key = type === "movie" ? "primary_release_date.lte" : "first_air_date.lte";
    return { [key]: `${OLDER_THAN_YEAR - 1}-12-31` };
  }
  if (/^\d{4}$/.test(value)) {
    return type === "movie"
      ? { primary_release_year: value }
      : { first_air_date_year: value };
  }
  return {};
}

export function genreParams(genreId?: string): Params {
  return genreId && genreId !== "all" && /^\d+$/.test(genreId)
    ? { with_genres: genreId }
    : {};
}
