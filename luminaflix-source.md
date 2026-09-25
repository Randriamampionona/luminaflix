# LuminaFlix refactor — complete source of every new or modified file
Each block is the full, final content of the file at the path shown above it. Deleted files are listed at the end.

## `hooks/use-auth-gate.ts`

```ts
"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildSignInHref, getCurrentLocation, rememberReturnTo } from "@/lib/auth-redirect";

/**
 * Gate for actions that need an account (download, favorites, reactions).
 *
 * BUG FIX: captures the *exact* current location (path + query + hash, e.g.
 * `/k-drama/play/42?s=2&e=5`) and hands it to Clerk as the post-auth
 * destination — for sign-in *and* sign-up — so users come back to the video
 * they were on instead of `/`.
 */
export function useAuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();

  const requireAuth = useCallback((): boolean => {
    if (isSignedIn) return true;

    const returnTo = getCurrentLocation();
    rememberReturnTo(returnTo); // safety net, see <PostAuthRedirect />

    if (isLoaded && clerk?.openSignIn) {
      clerk.openSignIn({
        forceRedirectUrl: returnTo,
        signUpForceRedirectUrl: returnTo,
      });
    } else {
      router.push(buildSignInHref(returnTo));
    }
    return false;
  }, [clerk, isLoaded, isSignedIn, router]);

  return { isLoaded, isSignedIn: !!isSignedIn, requireAuth };
}
```

## `hooks/use-reduced-motion.ts`

```ts
"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
```

## `hooks/use-scrolled.ts`

```ts
"use client";

import { useEffect, useState } from "react";

/**
 * PERF: the navbar used a raw scroll listener that called setState on every
 * scroll event. This version is passive, rAF-throttled and only updates
 * state when the boolean actually flips.
 */
export function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = false;

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const next = window.scrollY > threshold;
        if (next !== last) {
          last = next;
          setScrolled(next);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial position (e.g. after a reload mid-page)
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
```

## `i18n/actions.ts`

```ts
"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from "./config";

/** Persists the user's language choice. The caller refreshes the router. */
export async function setUserLocale(locale: string) {
  if (!isLocale(locale)) return { ok: false as const };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return { ok: true as const };
}
```

## `i18n/config.ts`

```ts
/**
 * Central i18n configuration.
 *
 * The UI locale also drives the TMDB `language` parameter, so titles,
 * overviews and genre names follow the language the user picked. The locale
 * is persisted in the `NEXT_LOCALE` cookie, which the server reads on every
 * request — the first paint is already translated, with no URL parameter.
 */
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const localeMeta: Record<
  Locale,
  { nativeName: string; short: string; tmdb: string; og: string }
> = {
  en: { nativeName: "English", short: "EN", tmdb: "en-US", og: "en_US" },
  fr: { nativeName: "Français", short: "FR", tmdb: "fr-FR", og: "fr_FR" },
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** Maps the legacy `?display_lang=fr-FR` query param to a locale. */
export function localeFromLegacyParam(value?: string | null): Locale | null {
  if (!value) return null;
  const base = value.toLowerCase().split("-")[0];
  return isLocale(base) ? base : null;
}

/** Picks the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const match = ranked.find((entry) => isLocale(entry.base));
  return match && isLocale(match.base) ? match.base : defaultLocale;
}
```

## `i18n/next-intl.d.ts`

```ts
import type en from "../locales/en.json";
import type { Locale } from "./config";

// Typed translation keys: a typo, or a key missing from en.json, fails `tsc`.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
```

## `i18n/request.ts`

```ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, negotiateLocale } from "./config";

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
    timeZone: "Europe/Paris",
  };
});
```

## `lib/auth-redirect.ts`

```ts
/**
 * Return-to-origin helpers for the sign-in flow.
 *
 * BUG FIX (auth redirect state loss): the download button used to send users
 * to `/sign-in?fallback_redirect_url=<pathname>`. That dropped the query
 * string (season / episode), wasn't Clerk's native parameter (so it was lost
 * when switching to sign-up or going through OAuth) and sign-up ignored it.
 *
 * We now (1) pass the full path + query as Clerk's `redirect_url` /
 * `forceRedirectUrl`, and (2) keep a short-lived copy in sessionStorage that
 * <PostAuthRedirect /> uses as a safety net if Clerk still lands on `/`.
 */
export const RETURN_TO_STORAGE_KEY = "luminaflix:return-to";
const RETURN_TO_TTL_MS = 15 * 60 * 1000;
const AUTH_ROUTE = /^\/(sign-in|sign-up)(\/|\?|#|$)/;

/**
 * Only allows same-origin relative paths (prevents open redirects).
 * Absolute URLs are accepted when their origin matches `origin`.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
  origin?: string,
): string | null {
  if (!value) return null;
  let candidate = value.trim();

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (!origin || url.origin !== origin) return null;
      candidate = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return null;
  }
  if (AUTH_ROUTE.test(candidate)) return null;
  return candidate;
}

export function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

export function buildSignInHref(returnTo: string, route: "/sign-in" | "/sign-up" = "/sign-in") {
  const safe = sanitizeReturnTo(returnTo);
  return safe ? `${route}?redirect_url=${encodeURIComponent(safe)}` : route;
}

export function rememberReturnTo(path: string) {
  const safe = sanitizeReturnTo(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(
      RETURN_TO_STORAGE_KEY,
      JSON.stringify({ path: safe, at: Date.now() }),
    );
  } catch {
    // Storage unavailable (private mode, quota) — Clerk's redirect still works.
  }
}

/** Reads and clears the stored path. Returns null when missing or expired. */
export function consumeReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !at || Date.now() - at > RETURN_TO_TTL_MS) return null;
    return sanitizeReturnTo(path);
  } catch {
    return null;
  }
}
```

## `lib/contact.ts`

```ts
/**
 * Contact form rules, shared by the client form (inline validation) and the
 * server action (authoritative validation). No server-only imports here.
 */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  subject: { min: 3, max: 150 },
  message: { min: 20, max: 5000 },
} as const;

export type ContactField = "name" | "email" | "subject" | "message";
export type ContactValues = Record<ContactField, string>;

/** Keys under `contact.errors.*`. */
export type ContactFieldError = "required" | ContactField;
export type ContactErrors = Partial<Record<ContactField, ContactFieldError>>;

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; name: string; email: string }
  | {
      status: "error";
      /** Keys under `contact.errors.*`. */
      error: "fixFields" | "rateLimited" | "spam" | "config" | "server";
      fieldErrors?: ContactErrors;
      values?: Partial<ContactValues>;
    };

// Pragmatic check: one @, no spaces, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeContact(input: Partial<Record<ContactField, unknown>>): ContactValues {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(input.name).trim().replace(/\s+/g, " "),
    email: str(input.email).trim().toLowerCase(),
    subject: str(input.subject).trim().replace(/\s+/g, " "),
    message: str(input.message).trim().replace(/\r\n/g, "\n"),
  };
}

export function validateContactField(field: ContactField, value: string): ContactFieldError | undefined {
  if (!value) return "required";
  switch (field) {
    case "name":
      return value.length < CONTACT_LIMITS.name.min || value.length > CONTACT_LIMITS.name.max ? "name" : undefined;
    case "email":
      return value.length > CONTACT_LIMITS.email.max || !EMAIL_RE.test(value) ? "email" : undefined;
    case "subject":
      return value.length < CONTACT_LIMITS.subject.min || value.length > CONTACT_LIMITS.subject.max
        ? "subject"
        : undefined;
    case "message":
      return value.length < CONTACT_LIMITS.message.min || value.length > CONTACT_LIMITS.message.max
        ? "message"
        : undefined;
  }
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of ["name", "email", "subject", "message"] as const) {
    const error = validateContactField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
```

## `lib/filters.ts`

```ts
/**
 * Filter / sort definitions shared by the server actions and the filter UI.
 * Kept free of server-only imports so client components can use them.
 */
export type MediaType = "movie" | "tv";

const CURRENT_YEAR = new Date().getFullYear();

/** The four most recent years get a chip; everything before is "older". */
export const YEAR_OPTIONS = [0, 1, 2, 3].map((offset) => String(CURRENT_YEAR - offset));
export const OLDER_THAN_YEAR = CURRENT_YEAR - 3;

export type SortKey = "recent" | "popular" | "oldest" | "topRated" | "az";

export const SORT_OPTIONS: Record<MediaType, { key: SortKey; value: string }[]> = {
  movie: [
    { key: "recent", value: "primary_release_date.desc" },
    { key: "popular", value: "popularity.desc" },
    { key: "oldest", value: "primary_release_date.asc" },
    { key: "topRated", value: "vote_average.desc" },
    { key: "az", value: "title.asc" },
  ],
  tv: [
    { key: "recent", value: "first_air_date.desc" },
    { key: "popular", value: "popularity.desc" },
    { key: "oldest", value: "first_air_date.asc" },
    { key: "topRated", value: "vote_average.desc" },
    { key: "az", value: "name.asc" },
  ],
};

/** Returns a sort value valid for the media type (unknown values → default). */
export function resolveSort(value: string | undefined, type: MediaType, fallback?: string) {
  const options = SORT_OPTIONS[type];
  const match = options.find((option) => option.value === value);
  return match?.value ?? fallback ?? options[0].value;
}

export type GenreKey = `g${number}`;

/** TMDB genre IDs differ between movies and TV. Names come from `genres.*`. */
export const GENRE_OPTIONS: Record<MediaType, string[]> = {
  movie: ["28", "12", "16", "35", "80", "99", "18", "14", "27", "10749", "878", "53"],
  tv: ["10759", "16", "35", "80", "99", "18", "10751", "9648", "10765", "10768"],
};

/** Genres offered as shortcuts in the search dialog. */
export const SEARCH_GENRES = ["28", "16", "99", "18", "27", "10751", "14", "36", "10402", "878", "53", "37", "9648"];
```

## `lib/media.ts`

```ts
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
```

## `lib/navigation.ts`

```ts
/** Single source of truth for navigation (navbar, mobile sheet, footer). */
export const NAV_ITEMS = [
  { key: "movies", href: "/movies" },
  { key: "newPopular", href: "/new-popular" },
  { key: "kdrama", href: "/k-drama" },
  { key: "library", href: "/library" },
  { key: "genres", href: "/genres" },
  { key: "anime", href: "/anime" },
  { key: "tvShows", href: "/tv-shows" },
  { key: "favorites", href: "/favorites" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** Number of items shown inline on desktop; the rest go under "More". */
export const NAV_INLINE_COUNT = 3;

export const FOOTER_SECTIONS = [
  {
    key: "navigation",
    links: [
      { key: "home", href: "/" },
      { key: "movies", href: "/movies" },
      { key: "tvShows", href: "/tv-shows" },
      { key: "library", href: "/library" },
      { key: "newPopular", href: "/new-popular" },
    ],
  },
  {
    key: "support",
    links: [
      { key: "help", href: "/help" },
      { key: "faq", href: "/help#faq" },
      { key: "contact", href: "/contact" },
      { key: "terms", href: "/terms" },
      { key: "privacy", href: "/privacy" },
    ],
  },
  {
    key: "premium",
    links: [
      { key: "plus", href: "/premium" },
      { key: "plans", href: "/premium#plans" },
      { key: "devices", href: "/help#devices" },
    ],
  },
] as const;

/**
 * Social profiles. Entries without an href are not rendered — the previous
 * footer pointed every icon at "#".
 */
export const SOCIAL_LINKS: { key: "facebook" | "twitter" | "instagram" | "youtube" | "github"; href?: string }[] = [
  { key: "facebook" },
  { key: "twitter" },
  { key: "instagram" },
  { key: "youtube" },
  { key: "github" },
];
```

## `lib/tmdb-image-loader.ts`

```ts
import type { ImageLoaderProps } from "next/image";

/**
 * TMDB size buckets. Anything wider than the largest bucket is capped at
 * w1280: `original` files are often 4K / several MB, which was the main
 * cause of the slow hero and details pages.
 */
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const;
const TMDB_PATTERN = /^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/.+)$/;

export default function tmdbImageLoader({ src, width }: ImageLoaderProps) {
  const match = src.match(TMDB_PATTERN);
  if (match) {
    const bucket =
      TMDB_WIDTHS.find((size) => size >= width) ??
      TMDB_WIDTHS[TMDB_WIDTHS.length - 1];
    return `https://image.tmdb.org/t/p/w${bucket}${match[1]}`;
  }
  // Non-TMDB sources are served as-is; the width hint keeps srcset entries
  // unique and satisfies Next's loader contract.
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}w=${width}`;
}
```

## `lib/tmdb.ts`

```ts
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
export async function getTmdbLanguage(): Promise<string> {
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
```

## `lib/typography.ts`

```ts
/**
 * Shared typography scale. Every page heading uses these tokens so weight,
 * tracking and responsive sizes stay identical across routes.
 */
export const type = {
  /** Hero / marquee titles (home slider, details hero). */
  display:
    "text-4xl sm:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-[0.95] text-white",
  /** One per page. */
  h1: "text-4xl sm:text-5xl lg:text-6xl font-black uppercase italic tracking-tighter leading-none text-white",
  /** Section titles (rows, blocks). */
  h2: "text-xl sm:text-2xl lg:text-3xl font-black uppercase italic tracking-tighter leading-tight text-white",
  /** Card / sub-section titles. */
  h3: "text-base sm:text-lg font-black uppercase italic tracking-tight leading-snug text-white",
  /** Small label above a heading. */
  eyebrow: "text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500",
  /** Paragraph copy. */
  body: "text-sm sm:text-base leading-relaxed text-zinc-400",
  /** Secondary metadata (counts, dates). */
  meta: "text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500",
  /** Long-form prose (legal, help). */
  prose: "text-sm sm:text-[15px] leading-7 text-zinc-300",
} as const;

/** Vertical rhythm between page sections. */
export const spacing = {
  pageTop: "pt-28 sm:pt-32",
  pageBottom: "pb-16 sm:pb-24",
  section: "py-10 sm:py-14",
  stack: "space-y-10 sm:space-y-14",
} as const;
```

## `locales/en.json`

```json
{
  "metadata": {
    "defaultTitle": "LuminaFlix | Stream your favorites",
    "description": "The private streaming platform for friends and family.",
    "ogDescription": "Watch the latest movies and TV shows together.",
    "ogAlt": "LuminaFlix preview",
    "pages": {
      "movies": "Movies",
      "tvShows": "TV shows",
      "library": "Library",
      "newPopular": "New & popular",
      "anime": "Anime",
      "kdrama": "K-Drama",
      "genres": "Genres",
      "favorites": "My favorites",
      "search": "Search: {query}",
      "help": "Help center",
      "privacy": "Privacy policy",
      "terms": "Terms of use",
      "contact": "Contact us",
      "premium": "Premium",
      "signIn": "Sign in",
      "signUp": "Create account",
      "trailer": "Trailer",
      "notFound": "Page not found"
    }
  },
  "common": {
    "brandFirst": "Lumina",
    "brandSecond": "Flix",
    "home": "Home",
    "back": "Back",
    "close": "Close",
    "loading": "Loading…",
    "retry": "Try again",
    "seeAll": "See all",
    "viewAll": "View all",
    "scrollLeft": "Scroll left",
    "scrollRight": "Scroll right",
    "unknown": "Unknown",
    "notAvailable": "N/A",
    "tba": "TBA",
    "comingSoon": "Coming soon",
    "loadError": "We couldn't load this content. Check your connection and try again."
  },
  "nav": {
    "movies": "Movies",
    "newPopular": "New & Popular",
    "kdrama": "K-Drama",
    "library": "Library",
    "genres": "Genres",
    "anime": "Anime",
    "tvShows": "TV Shows",
    "favorites": "Favorites",
    "more": "More",
    "menu": "Navigation",
    "openMenu": "Open menu",
    "closeMenu": "Close menu",
    "mainNavigation": "Main navigation"
  },
  "auth": {
    "signIn": "Sign in",
    "join": "Join Lumina",
    "joinNow": "Join Lumina now",
    "account": "Account",
    "memberBadge": "Member"
  },
  "language": {
    "label": "Language",
    "change": "Change language",
    "current": "Current language: {language}"
  },
  "search": {
    "trigger": "Search…",
    "shortcut": "Ctrl K",
    "dialogTitle": "Search LuminaFlix",
    "placeholder": "Search titles…",
    "mobilePlaceholder": "Search Lumina…",
    "submit": "Search",
    "categories": "Browse by genre",
    "seeAllGenres": "All genres",
    "runSearch": "Press Enter to search for “{query}”",
    "escHint": "to close",
    "resultsEyebrow": "Search results",
    "matches": "{count, plural, =0 {No matches} one {# match} other {# matches}}",
    "emptyTitle": "No results",
    "emptyBody": "Nothing matches “{query}”. Check the spelling or try a shorter title.",
    "animePlaceholder": "Search anime…",
    "kdramaPlaceholder": "Search K-dramas…",
    "resultsFor": "Results for",
    "backTo": "Back to {section}"
  },
  "footer": {
    "tagline": "Movies, series, anime and K-dramas in one place. Pick a title, press play, and share it with the people you watch with.",
    "sections": {
      "navigation": "Navigation",
      "support": "Support",
      "premium": "Premium"
    },
    "links": {
      "home": "Home",
      "movies": "Movies",
      "tvShows": "TV Shows",
      "library": "Library",
      "newPopular": "New & Popular",
      "help": "Help center",
      "faq": "FAQ",
      "contact": "Contact us",
      "terms": "Terms of use",
      "privacy": "Privacy policy",
      "plus": "Lumina Plus",
      "plans": "Compare plans",
      "devices": "Ways to watch"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "X (Twitter)",
      "instagram": "Instagram",
      "youtube": "YouTube",
      "github": "GitHub"
    },
    "copyright": "© {year} LuminaFlix Media Inc.",
    "by": "By",
    "status": "All systems operational",
    "tmdb": "This product uses the TMDB API but is not endorsed or certified by TMDB."
  },
  "home": {
    "heroBadge": "Trending now",
    "heroLabel": "Today's picks",
    "playNow": "Play now",
    "moreInfo": "More info",
    "slide": "Show slide {index}",
    "topFilms": "Top films",
    "topTv": "Top 10 series this week",
    "latest": "Latest movies",
    "genresEyebrow": "Genres",
    "genresTitle": "Browse by category",
    "genresViewAll": "All genres",
    "featuredBadge": "Coup de coeur",
    "featuredRating": "{rating} rating",
    "viewDetails": "View details",
    "ctaTitle": "Ready to dive in?",
    "ctaBody": "Browse the whole collection of movies and series. Filter by genre, year or rating to find exactly what you're in the mood for.",
    "ctaButton": "Explore the library",
    "loadError": "The home feed is unavailable right now. Try again in a moment."
  },
  "media": {
    "movie": "Movie",
    "series": "Series",
    "anime": "Anime",
    "kdrama": "K-Drama",
    "quality4k": "4K",
    "startWatching": "Start watching",
    "exploreEpisodes": "Explore episodes",
    "watchTrailer": "Watch trailer",
    "openDetails": "Open details for {title}",
    "play": "Play {title}",
    "rating": "Rating",
    "released": "Released",
    "runtime": "Runtime",
    "runtimeValue": "{minutes} min",
    "synopsis": "Synopsis",
    "details": "Details",
    "genreTitles": "{count, number} movies & shows",
    "nowPlaying": "Now playing",
    "notFoundTitle": "Title not found",
    "notFoundBody": "This title (#{id}) is unavailable. Here are similar titles you can watch instead.",
    "similarTo": "Similar to “{query}”",
    "noSimilar": "No similar titles found.",
    "backHome": "Back to home"
  },
  "filters": {
    "button": "Filters",
    "title": "Refine",
    "genres": "Genres",
    "year": "Release year",
    "allGenres": "All genres",
    "allYears": "All",
    "older": "Older",
    "apply": "Apply filters",
    "reset": "Reset filters",
    "sortLabel": "Sort by",
    "sort": {
      "recent": "Most recent",
      "popular": "Most popular",
      "oldest": "Oldest first",
      "topRated": "Top rated",
      "az": "Name A–Z"
    },
    "empty": "No titles match these filters.",
    "emptyBody": "Try another genre or year, or reset the filters."
  },
  "genres": {
    "g12": "Adventure",
    "g14": "Fantasy",
    "g16": "Animation",
    "g18": "Drama",
    "g27": "Horror",
    "g28": "Action",
    "g35": "Comedy",
    "g36": "History",
    "g37": "Western",
    "g53": "Thriller",
    "g80": "Crime",
    "g99": "Documentary",
    "g878": "Science fiction",
    "g9648": "Mystery",
    "g10402": "Music",
    "g10749": "Romance",
    "g10751": "Family",
    "g10759": "Action & Adventure",
    "g10765": "Sci-Fi & Fantasy",
    "g10768": "War & Politics"
  },
  "pagination": {
    "label": "Pagination",
    "previous": "Previous page",
    "next": "Next page",
    "page": "Page {page}"
  },
  "pages": {
    "movies": {
      "title": "Lumina",
      "accent": "Movies",
      "count": "{count, number} movies"
    },
    "tvShows": {
      "title": "Series",
      "accent": "Vault",
      "count": "{count, number} series"
    },
    "library": {
      "title": "Master",
      "accent": "Archive",
      "count": "{count, number} acclaimed films",
      "allContent": "All content",
      "sortedBy": "Sorted by: {sort}",
      "shortcuts": {
        "topRated": "Top rated",
        "popular": "Most popular",
        "favorites": "My favorites",
        "genres": "All genres"
      }
    },
    "newPopular": {
      "title": "Hot",
      "accent": "Trending",
      "subtitle": "What everyone is watching right now",
      "empty": "No trending titles right now."
    },
    "anime": {
      "title": "Lumina",
      "accent": "Anime",
      "count": "{count, number} anime series",
      "empty": "No anime found."
    },
    "kdrama": {
      "title": "Lumina",
      "accent": "K-Drama",
      "count": "{count, number} Korean series",
      "empty": "No Korean series found."
    },
    "genres": {
      "eyebrow": "Directory",
      "title": "Genre map",
      "explore": "Explore",
      "total": "{count, number} genres"
    },
    "genre": {
      "eyebrow": "Genre",
      "unknown": "Unknown genre",
      "count": "{count, number} titles",
      "empty": "No titles in this genre yet."
    },
    "favorites": {
      "eyebrow": "Your collection",
      "title": "My",
      "accent": "Vault",
      "count": "{count, plural, =0 {Nothing saved yet} one {# saved title} other {# saved titles}}",
      "emptyTitle": "Your vault is empty",
      "emptyBody": "Save movies and episodes with “Add to favorites” and they'll show up here.",
      "emptyCta": "Start exploring",
      "remove": "Remove from favorites",
      "removeError": "Couldn't remove this title. Try again.",
      "removed": "Removed from favorites",
      "film": "Film",
      "series": "Series",
      "savedOn": "Saved {date}"
    }
  },
  "details": {
    "seriesBadge": "Series",
    "kdramaBadge": "K-Drama",
    "animeBadge": "Anime series",
    "notFound": "This series is unavailable.",
    "backToSeries": "Back to series",
    "season": "Season",
    "episode": "Episode",
    "episodeFallback": "Episode {number}",
    "nowStreaming": "Now streaming",
    "streamInfoTitle": "About this stream",
    "streamInfoBody": "You're watching {title} — {episode}. If playback stalls, switch to another server below the player.",
    "subtitlesNote": "Subtitles are embedded in the stream when available."
  },
  "episodes": {
    "title": "Episodes",
    "seasonActive": "Season {season}",
    "seasonShort": "S{season}",
    "seasonLong": "Season {season}",
    "moreSeasons": "More",
    "episodeShort": "EP {number}",
    "empty": "No episodes available",
    "emptyBody": "Season {season} has no episodes listed yet.",
    "loadError": "Couldn't load this season.",
    "showing": "Showing {shown} of {total}",
    "loadMore": "Show more episodes",
    "play": "Play episode {number}"
  },
  "player": {
    "tabs": {
      "fr": "FR channel",
      "en": "EN channel",
      "vo": "Original (VO)",
      "vf": "French (VF)"
    },
    "play": "Play stream",
    "playEpisode": "Play episode",
    "fullscreen": "Fullscreen",
    "exitFullscreen": "Exit fullscreen",
    "advisoryTitle": "Playback tip",
    "advisoryBody": "If the stream is unavailable or buffering, switch to another server below.",
    "servers": "Servers",
    "active": "Playing",
    "standby": "Available",
    "readyIn": "Audio: {language}",
    "languages": {
      "fr": "French",
      "en": "English",
      "vo": "Original",
      "vf": "French",
      "all": "Original"
    },
    "episodeTag": "S{season} E{episode}",
    "sourceId": "Source ID: {id}",
    "iframeTitle": "{title} player"
  },
  "actions": {
    "addFavorite": "Add to favorites",
    "inFavorites": "In favorites",
    "saving": "Saving…",
    "like": "Like",
    "dislike": "Dislike",
    "error": "That didn't go through. Try again."
  },
  "download": {
    "loginRequired": "Sign in to download",
    "download": "Download",
    "directAccess": "Direct access",
    "authNeeded": "Account required",
    "buttonLabel": "Download this title",
    "qrTitle": "Scan to download",
    "qrBody": "Open your phone's camera and scan the code to continue on your mobile device.",
    "qrBadge": "Continue on mobile",
    "close": "Close"
  },
  "guard": {
    "title": "Playback blocked",
    "code": "Detected: {reason}",
    "adblock": "an ad blocker",
    "idm": "a download manager extension",
    "body": "We detected {what}. Disable it for this site, then reload the page.",
    "reload": "Reload page"
  },
  "trailer": {
    "back": "Back to home",
    "unavailable": "No trailer is available for this title.",
    "start": "Start watching",
    "switchTo": "Switch to {lang}",
    "language": "Trailer language",
    "playTrailer": "Play trailer",
    "loadingAd": "Loading sponsor message…",
    "timeout": "Skipping automatically in {seconds}s",
    "skipNow": "Skip and play trailer",
    "skipIn": "Skip in {seconds}s",
    "bypass": "Play trailer now"
  },
  "notFound": {
    "title": "404",
    "heading": "This page doesn't exist",
    "body": "The link may be broken or the page may have moved.",
    "cta": "Back to home"
  },
  "contact": {
    "eyebrow": "Support",
    "title": "Contact",
    "accent": "us",
    "description": "Questions, bug reports or partnership requests — send us a message and we'll reply by email.",
    "responseTime": "We usually reply within 2 business days.",
    "helpPrompt": "Looking for a quick answer?",
    "helpLink": "Browse the help center",
    "fields": {
      "name": "Name",
      "email": "Email",
      "subject": "Subject",
      "message": "Message"
    },
    "placeholders": {
      "name": "Your name",
      "email": "you@example.com",
      "subject": "What is this about?",
      "message": "Tell us as much as you can…"
    },
    "topics": {
      "premium": "Premium: notify me at launch"
    },
    "messageCounter": "{count} / {max}",
    "submit": "Send message",
    "sending": "Sending…",
    "errors": {
      "required": "This field is required.",
      "name": "Enter between 2 and 100 characters.",
      "email": "Enter a valid email address.",
      "subject": "Enter between 3 and 150 characters.",
      "message": "Enter between 20 and 5,000 characters.",
      "rateLimited": "Too many messages. Wait a few minutes before trying again.",
      "spam": "Your message couldn't be sent. Reload the page and try again.",
      "config": "The contact form is temporarily unavailable. Try again later.",
      "server": "Your message couldn't be sent. Try again in a moment.",
      "fixFields": "Check the highlighted fields."
    },
    "success": {
      "title": "Message sent",
      "body": "Thanks, {name}. We'll reply to {email} soon.",
      "again": "Send another message"
    }
  },
  "premium": {
    "badge": "Coming soon",
    "title": "Lumina",
    "accent": "Plus",
    "description": "Premium plans are on the way: better quality, more screens and no interruptions. Everything available today stays free.",
    "notify": "Notify me at launch",
    "plansTitle": "Plans",
    "plansDescription": "Pricing will be announced at launch.",
    "current": "Current plan",
    "priceTba": "Price at launch",
    "free": "Free",
    "perMonth": "/ month",
    "unavailable": "Coming soon",
    "plans": {
      "free": {
        "name": "Free",
        "tagline": "Everything you use today.",
        "features": ["Full catalog of movies, series, anime and K-dramas", "Favorites synced to your account", "English and French interface"]
      },
      "plus": {
        "name": "Plus",
        "tagline": "For people who watch every day.",
        "features": ["No sponsor messages before trailers", "Priority servers during peak hours", "Early access to new features"]
      },
      "family": {
        "name": "Family",
        "tagline": "One plan for the whole household.",
        "features": ["Everything in Plus", "Up to 5 profiles with separate favorites", "Parental controls per profile"]
      }
    },
    "recommended": "Most popular",
    "faqTitle": "Questions about Premium",
    "faq": [
      { "q": "Will the free plan change?", "a": "No. Everything available today stays free when Premium launches." },
      { "q": "When is Premium launching?", "a": "We'll announce the date and pricing by email to everyone who asked to be notified." },
      { "q": "How do I get notified?", "a": "Use “Notify me at launch” to send us a message with your email address." }
    ]
  },
  "help": {
    "eyebrow": "Support",
    "title": "Help",
    "accent": "center",
    "description": "Answers to the most common questions about accounts, playback and languages.",
    "faqTitle": "Frequently asked questions",
    "devicesTitle": "Ways to watch",
    "devicesBody": "LuminaFlix runs in any modern browser — no app to install.",
    "devices": [
      { "title": "Computer", "body": "Chrome, Edge, Firefox or Safari, on Windows, macOS or Linux." },
      { "title": "Phone & tablet", "body": "Safari on iOS/iPadOS and Chrome on Android. Rotate your device for fullscreen playback." },
      { "title": "TV", "body": "Cast a browser tab from Chrome, or open the site in your TV's built-in browser." }
    ],
    "categories": [
      {
        "title": "Account",
        "items": [
          { "q": "Do I need an account to watch?", "a": "No. You can browse and watch without an account. Signing in lets you save favorites, like titles and download." },
          { "q": "How do I delete my account?", "a": "Open your profile menu, choose “Manage account”, then “Delete account”. Your favorites are removed with it." }
        ]
      },
      {
        "title": "Playback",
        "items": [
          { "q": "The video won't start or keeps buffering.", "a": "Streams come from several servers. Switch to another server below the player; if none work, reload the page." },
          { "q": "Why do I see “Playback blocked”?", "a": "Some browser extensions (ad blockers, download managers) prevent the player from loading. Disable them for this site and reload." }
        ]
      },
      {
        "title": "Language",
        "items": [
          { "q": "How do I change the language?", "a": "Use the language menu in the navigation bar or the footer. Your choice is remembered on this device." },
          { "q": "Does the language change titles and summaries?", "a": "Yes. Titles, summaries and genres switch to the selected language when a translation exists." }
        ]
      }
    ],
    "stillNeedHelp": "Still need help?",
    "stillNeedHelpBody": "Send us a message and we'll get back to you by email.",
    "contactCta": "Contact us"
  },
  "legal": {
    "updated": "Last updated: {date}",
    "contactPrompt": "Questions about this page?",
    "contactCta": "Contact us",
    "privacy": {
      "title": "Privacy",
      "accent": "policy",
      "intro": "This policy explains what information LuminaFlix collects, why, and the choices you have.",
      "sections": [
        { "title": "Information we collect", "body": "When you create an account, our authentication provider (Clerk) stores your name, email address and profile picture. We store the titles you add to favorites and your likes. When you use the contact form we receive your name, email and message." },
        { "title": "How we use it", "body": "We use this information to run your account, sync your favorites, reply to your messages and send occasional recommendation emails. We don't sell your personal information." },
        { "title": "Cookies and local storage", "body": "We use essential cookies for sign-in and to remember your language. Analytics (Vercel Analytics) measure page views without cross-site tracking." },
        { "title": "Third-party services", "body": "Movie and series information comes from TMDB. Video players are provided by third-party services that have their own privacy policies and may set their own cookies." },
        { "title": "Your rights", "body": "You can access, correct or delete your data at any time from your account settings, or by contacting us. If you live in the EU, you may also lodge a complaint with your data protection authority." },
        { "title": "Retention", "body": "We keep your data while your account is active. Deleting your account removes your profile and favorites within 30 days." }
      ]
    },
    "terms": {
      "title": "Terms of",
      "accent": "use",
      "intro": "By using LuminaFlix you agree to these terms. Please read them carefully.",
      "sections": [
        { "title": "The service", "body": "LuminaFlix is a catalog that displays information from TMDB and embeds players operated by third parties. We don't host video files and don't control the content provided by these services." },
        { "title": "Your account", "body": "You're responsible for activity on your account and for keeping your sign-in details secure. You must be old enough to consent to data processing in your country." },
        { "title": "Acceptable use", "body": "Don't attempt to disrupt the service, scrape it at scale, or use it for unlawful purposes. We may suspend accounts that do." },
        { "title": "Rights holders", "body": "If you believe content accessible through LuminaFlix infringes your rights, contact us with the details and we'll review your request promptly." },
        { "title": "Disclaimer", "body": "The service is provided “as is”, without warranties of availability or fitness for a particular purpose, to the extent permitted by law." },
        { "title": "Changes", "body": "We may update these terms. When we do, we'll change the date at the top of this page. Continuing to use the service means you accept the updated terms." }
      ]
    }
  }
}
```

## `locales/fr.json`

```json
{
  "metadata": {
    "defaultTitle": "LuminaFlix | Vos films et séries préférés",
    "description": "La plateforme de streaming privée pour les amis et la famille.",
    "ogDescription": "Regardez les derniers films et séries ensemble.",
    "ogAlt": "Aperçu de LuminaFlix",
    "pages": {
      "movies": "Films",
      "tvShows": "Séries",
      "library": "Bibliothèque",
      "newPopular": "Nouveautés et tendances",
      "anime": "Anime",
      "kdrama": "K-Drama",
      "genres": "Genres",
      "favorites": "Mes favoris",
      "search": "Recherche : {query}",
      "help": "Centre d'aide",
      "privacy": "Politique de confidentialité",
      "terms": "Conditions d'utilisation",
      "contact": "Nous contacter",
      "premium": "Premium",
      "signIn": "Connexion",
      "signUp": "Créer un compte",
      "trailer": "Bande-annonce",
      "notFound": "Page introuvable"
    }
  },
  "common": {
    "brandFirst": "Lumina",
    "brandSecond": "Flix",
    "home": "Accueil",
    "back": "Retour",
    "close": "Fermer",
    "loading": "Chargement…",
    "retry": "Réessayer",
    "seeAll": "Tout voir",
    "viewAll": "Tout afficher",
    "scrollLeft": "Faire défiler vers la gauche",
    "scrollRight": "Faire défiler vers la droite",
    "unknown": "Inconnu",
    "notAvailable": "N/D",
    "tba": "À venir",
    "comingSoon": "Bientôt disponible",
    "loadError": "Impossible de charger ce contenu. Vérifiez votre connexion et réessayez."
  },
  "nav": {
    "movies": "Films",
    "newPopular": "Nouveautés",
    "kdrama": "K-Drama",
    "library": "Bibliothèque",
    "genres": "Genres",
    "anime": "Anime",
    "tvShows": "Séries",
    "favorites": "Favoris",
    "more": "Plus",
    "menu": "Navigation",
    "openMenu": "Ouvrir le menu",
    "closeMenu": "Fermer le menu",
    "mainNavigation": "Navigation principale"
  },
  "auth": {
    "signIn": "Connexion",
    "join": "Rejoindre Lumina",
    "joinNow": "Rejoindre Lumina",
    "account": "Compte",
    "memberBadge": "Membre"
  },
  "language": {
    "label": "Langue",
    "change": "Changer de langue",
    "current": "Langue actuelle : {language}"
  },
  "search": {
    "trigger": "Rechercher…",
    "shortcut": "Ctrl K",
    "dialogTitle": "Rechercher sur LuminaFlix",
    "placeholder": "Rechercher un titre…",
    "mobilePlaceholder": "Rechercher sur Lumina…",
    "submit": "Rechercher",
    "categories": "Parcourir par genre",
    "seeAllGenres": "Tous les genres",
    "runSearch": "Appuyez sur Entrée pour rechercher « {query} »",
    "escHint": "pour fermer",
    "resultsEyebrow": "Résultats de recherche",
    "matches": "{count, plural, =0 {Aucun résultat} one {# résultat} other {# résultats}}",
    "emptyTitle": "Aucun résultat",
    "emptyBody": "Rien ne correspond à « {query} ». Vérifiez l'orthographe ou essayez un titre plus court.",
    "animePlaceholder": "Rechercher un anime…",
    "kdramaPlaceholder": "Rechercher un K-drama…",
    "resultsFor": "Résultats pour",
    "backTo": "Retour à {section}"
  },
  "footer": {
    "tagline": "Films, séries, anime et K-dramas réunis au même endroit. Choisissez un titre, lancez la lecture et partagez-le avec vos proches.",
    "sections": {
      "navigation": "Navigation",
      "support": "Assistance",
      "premium": "Premium"
    },
    "links": {
      "home": "Accueil",
      "movies": "Films",
      "tvShows": "Séries",
      "library": "Bibliothèque",
      "newPopular": "Nouveautés",
      "help": "Centre d'aide",
      "faq": "FAQ",
      "contact": "Nous contacter",
      "terms": "Conditions d'utilisation",
      "privacy": "Confidentialité",
      "plus": "Lumina Plus",
      "plans": "Comparer les offres",
      "devices": "Où regarder"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "X (Twitter)",
      "instagram": "Instagram",
      "youtube": "YouTube",
      "github": "GitHub"
    },
    "copyright": "© {year} LuminaFlix Media Inc.",
    "by": "Par",
    "status": "Tous les services sont opérationnels",
    "tmdb": "Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB."
  },
  "home": {
    "heroBadge": "Tendance",
    "heroLabel": "La sélection du jour",
    "playNow": "Lecture",
    "moreInfo": "Plus d'infos",
    "slide": "Afficher la diapositive {index}",
    "topFilms": "Films les mieux notés",
    "topTv": "Top 10 des séries de la semaine",
    "latest": "Derniers films",
    "genresEyebrow": "Genres",
    "genresTitle": "Parcourir par catégorie",
    "genresViewAll": "Tous les genres",
    "featuredBadge": "Coup de cœur",
    "featuredRating": "Note : {rating}",
    "viewDetails": "Voir les détails",
    "ctaTitle": "Prêt à plonger ?",
    "ctaBody": "Parcourez toute la collection de films et de séries. Filtrez par genre, année ou note pour trouver exactement ce qui vous tente.",
    "ctaButton": "Explorer la bibliothèque",
    "loadError": "L'accueil est momentanément indisponible. Réessayez dans un instant."
  },
  "media": {
    "movie": "Film",
    "series": "Série",
    "anime": "Anime",
    "kdrama": "K-Drama",
    "quality4k": "4K",
    "startWatching": "Regarder",
    "exploreEpisodes": "Voir les épisodes",
    "watchTrailer": "Voir la bande-annonce",
    "openDetails": "Ouvrir les détails de {title}",
    "play": "Lire {title}",
    "rating": "Note",
    "released": "Sortie",
    "runtime": "Durée",
    "runtimeValue": "{minutes} min",
    "synopsis": "Synopsis",
    "details": "Détails",
    "genreTitles": "{count, number} films et séries",
    "nowPlaying": "En lecture",
    "notFoundTitle": "Titre introuvable",
    "notFoundBody": "Ce titre (n° {id}) n'est pas disponible. Voici des titres similaires à regarder à la place.",
    "similarTo": "Similaire à « {query} »",
    "noSimilar": "Aucun titre similaire trouvé.",
    "backHome": "Retour à l'accueil"
  },
  "filters": {
    "button": "Filtres",
    "title": "Affiner",
    "genres": "Genres",
    "year": "Année de sortie",
    "allGenres": "Tous les genres",
    "allYears": "Toutes",
    "older": "Plus ancien",
    "apply": "Appliquer les filtres",
    "reset": "Réinitialiser les filtres",
    "sortLabel": "Trier par",
    "sort": {
      "recent": "Plus récents",
      "popular": "Plus populaires",
      "oldest": "Plus anciens",
      "topRated": "Mieux notés",
      "az": "Nom A–Z"
    },
    "empty": "Aucun titre ne correspond à ces filtres.",
    "emptyBody": "Essayez un autre genre ou une autre année, ou réinitialisez les filtres."
  },
  "genres": {
    "g12": "Aventure",
    "g14": "Fantastique",
    "g16": "Animation",
    "g18": "Drame",
    "g27": "Horreur",
    "g28": "Action",
    "g35": "Comédie",
    "g36": "Histoire",
    "g37": "Western",
    "g53": "Thriller",
    "g80": "Crime",
    "g99": "Documentaire",
    "g878": "Science-fiction",
    "g9648": "Mystère",
    "g10402": "Musique",
    "g10749": "Romance",
    "g10751": "Familial",
    "g10759": "Action et aventure",
    "g10765": "Science-fiction et fantastique",
    "g10768": "Guerre et politique"
  },
  "pagination": {
    "label": "Pagination",
    "previous": "Page précédente",
    "next": "Page suivante",
    "page": "Page {page}"
  },
  "pages": {
    "movies": {
      "title": "Lumina",
      "accent": "Films",
      "count": "{count, number} films"
    },
    "tvShows": {
      "title": "Coffre",
      "accent": "Séries",
      "count": "{count, number} séries"
    },
    "library": {
      "title": "Grande",
      "accent": "Archive",
      "count": "{count, number} films acclamés",
      "allContent": "Tout le contenu",
      "sortedBy": "Tri : {sort}",
      "shortcuts": {
        "topRated": "Mieux notés",
        "popular": "Plus populaires",
        "favorites": "Mes favoris",
        "genres": "Tous les genres"
      }
    },
    "newPopular": {
      "title": "En",
      "accent": "Tendance",
      "subtitle": "Ce que tout le monde regarde en ce moment",
      "empty": "Aucune tendance pour le moment."
    },
    "anime": {
      "title": "Lumina",
      "accent": "Anime",
      "count": "{count, number} séries anime",
      "empty": "Aucun anime trouvé."
    },
    "kdrama": {
      "title": "Lumina",
      "accent": "K-Drama",
      "count": "{count, number} séries coréennes",
      "empty": "Aucune série coréenne trouvée."
    },
    "genres": {
      "eyebrow": "Répertoire",
      "title": "Carte des genres",
      "explore": "Explorer",
      "total": "{count, number} genres"
    },
    "genre": {
      "eyebrow": "Genre",
      "unknown": "Genre inconnu",
      "count": "{count, number} titres",
      "empty": "Aucun titre dans ce genre pour le moment."
    },
    "favorites": {
      "eyebrow": "Votre collection",
      "title": "Mon",
      "accent": "Coffre",
      "count": "{count, plural, =0 {Aucun titre enregistré} one {# titre enregistré} other {# titres enregistrés}}",
      "emptyTitle": "Votre coffre est vide",
      "emptyBody": "Enregistrez des films et des épisodes avec « Ajouter aux favoris » pour les retrouver ici.",
      "emptyCta": "Commencer à explorer",
      "remove": "Retirer des favoris",
      "removeError": "Impossible de retirer ce titre. Réessayez.",
      "removed": "Retiré des favoris",
      "film": "Film",
      "series": "Série",
      "savedOn": "Enregistré le {date}"
    }
  },
  "details": {
    "seriesBadge": "Série",
    "kdramaBadge": "K-Drama",
    "animeBadge": "Série anime",
    "notFound": "Cette série n'est pas disponible.",
    "backToSeries": "Retour à la série",
    "season": "Saison",
    "episode": "Épisode",
    "episodeFallback": "Épisode {number}",
    "nowStreaming": "En cours de lecture",
    "streamInfoTitle": "À propos de ce flux",
    "streamInfoBody": "Vous regardez {title} — {episode}. Si la lecture se bloque, changez de serveur sous le lecteur.",
    "subtitlesNote": "Les sous-titres sont intégrés au flux lorsqu'ils sont disponibles."
  },
  "episodes": {
    "title": "Épisodes",
    "seasonActive": "Saison {season}",
    "seasonShort": "S{season}",
    "seasonLong": "Saison {season}",
    "moreSeasons": "Plus",
    "episodeShort": "ÉP {number}",
    "empty": "Aucun épisode disponible",
    "emptyBody": "Aucun épisode n'est encore répertorié pour la saison {season}.",
    "loadError": "Impossible de charger cette saison.",
    "showing": "{shown} sur {total}",
    "loadMore": "Afficher plus d'épisodes",
    "play": "Lire l'épisode {number}"
  },
  "player": {
    "tabs": {
      "fr": "Canal FR",
      "en": "Canal EN",
      "vo": "Original (VO)",
      "vf": "Français (VF)"
    },
    "play": "Lancer la lecture",
    "playEpisode": "Lire l'épisode",
    "fullscreen": "Plein écran",
    "exitFullscreen": "Quitter le plein écran",
    "advisoryTitle": "Conseil de lecture",
    "advisoryBody": "Si le flux est indisponible ou saccade, choisissez un autre serveur ci-dessous.",
    "servers": "Serveurs",
    "active": "En lecture",
    "standby": "Disponible",
    "readyIn": "Audio : {language}",
    "languages": {
      "fr": "Français",
      "en": "Anglais",
      "vo": "Original",
      "vf": "Français",
      "all": "Original"
    },
    "episodeTag": "S{season} É{episode}",
    "sourceId": "ID de la source : {id}",
    "iframeTitle": "Lecteur : {title}"
  },
  "actions": {
    "addFavorite": "Ajouter aux favoris",
    "inFavorites": "Dans les favoris",
    "saving": "Enregistrement…",
    "like": "J'aime",
    "dislike": "Je n'aime pas",
    "error": "L'action a échoué. Réessayez."
  },
  "download": {
    "loginRequired": "Connectez-vous pour télécharger",
    "download": "Télécharger",
    "directAccess": "Accès direct",
    "authNeeded": "Compte requis",
    "buttonLabel": "Télécharger ce titre",
    "qrTitle": "Scanner pour télécharger",
    "qrBody": "Ouvrez l'appareil photo de votre téléphone et scannez le code pour continuer sur mobile.",
    "qrBadge": "Continuer sur mobile",
    "close": "Fermer"
  },
  "guard": {
    "title": "Lecture bloquée",
    "code": "Détecté : {reason}",
    "adblock": "un bloqueur de publicités",
    "idm": "une extension de gestionnaire de téléchargement",
    "body": "Nous avons détecté {what}. Désactivez-la pour ce site, puis rechargez la page.",
    "reload": "Recharger la page"
  },
  "trailer": {
    "back": "Retour à l'accueil",
    "unavailable": "Aucune bande-annonce n'est disponible pour ce titre.",
    "start": "Regarder",
    "switchTo": "Passer en {lang}",
    "language": "Langue de la bande-annonce",
    "playTrailer": "Lire la bande-annonce",
    "loadingAd": "Chargement du message sponsorisé…",
    "timeout": "Passage automatique dans {seconds} s",
    "skipNow": "Passer et lire la bande-annonce",
    "skipIn": "Passer dans {seconds} s",
    "bypass": "Lire la bande-annonce maintenant"
  },
  "notFound": {
    "title": "404",
    "heading": "Cette page n'existe pas",
    "body": "Le lien est peut-être cassé ou la page a été déplacée.",
    "cta": "Retour à l'accueil"
  },
  "contact": {
    "eyebrow": "Assistance",
    "title": "Nous",
    "accent": "contacter",
    "description": "Questions, signalements de bugs ou demandes de partenariat : envoyez-nous un message, nous répondrons par e-mail.",
    "responseTime": "Nous répondons généralement sous 2 jours ouvrés.",
    "helpPrompt": "Vous cherchez une réponse rapide ?",
    "helpLink": "Consulter le centre d'aide",
    "fields": {
      "name": "Nom",
      "email": "E-mail",
      "subject": "Objet",
      "message": "Message"
    },
    "placeholders": {
      "name": "Votre nom",
      "email": "vous@exemple.com",
      "subject": "De quoi s'agit-il ?",
      "message": "Donnez-nous un maximum de détails…"
    },
    "topics": {
      "premium": "Premium : me prévenir au lancement"
    },
    "messageCounter": "{count} / {max}",
    "submit": "Envoyer le message",
    "sending": "Envoi…",
    "errors": {
      "required": "Ce champ est obligatoire.",
      "name": "Saisissez entre 2 et 100 caractères.",
      "email": "Saisissez une adresse e-mail valide.",
      "subject": "Saisissez entre 3 et 150 caractères.",
      "message": "Saisissez entre 20 et 5 000 caractères.",
      "rateLimited": "Trop de messages. Patientez quelques minutes avant de réessayer.",
      "spam": "Votre message n'a pas pu être envoyé. Rechargez la page et réessayez.",
      "config": "Le formulaire de contact est momentanément indisponible. Réessayez plus tard.",
      "server": "Votre message n'a pas pu être envoyé. Réessayez dans un instant.",
      "fixFields": "Vérifiez les champs signalés."
    },
    "success": {
      "title": "Message envoyé",
      "body": "Merci, {name}. Nous répondrons bientôt à {email}.",
      "again": "Envoyer un autre message"
    }
  },
  "premium": {
    "badge": "Bientôt disponible",
    "title": "Lumina",
    "accent": "Plus",
    "description": "Les offres Premium arrivent : meilleure qualité, plus d'écrans et aucune interruption. Tout ce qui est disponible aujourd'hui reste gratuit.",
    "notify": "Me prévenir au lancement",
    "plansTitle": "Offres",
    "plansDescription": "Les tarifs seront annoncés au lancement.",
    "current": "Offre actuelle",
    "priceTba": "Tarif au lancement",
    "free": "Gratuit",
    "perMonth": "/ mois",
    "unavailable": "Bientôt disponible",
    "plans": {
      "free": {
        "name": "Gratuit",
        "tagline": "Tout ce que vous utilisez aujourd'hui.",
        "features": ["Catalogue complet de films, séries, anime et K-dramas", "Favoris synchronisés avec votre compte", "Interface en anglais et en français"]
      },
      "plus": {
        "name": "Plus",
        "tagline": "Pour celles et ceux qui regardent chaque jour.",
        "features": ["Aucun message sponsorisé avant les bandes-annonces", "Serveurs prioritaires aux heures de pointe", "Accès anticipé aux nouvelles fonctionnalités"]
      },
      "family": {
        "name": "Famille",
        "tagline": "Une seule offre pour tout le foyer.",
        "features": ["Tout le contenu de l'offre Plus", "Jusqu'à 5 profils avec favoris séparés", "Contrôle parental par profil"]
      }
    },
    "recommended": "La plus choisie",
    "faqTitle": "Questions sur Premium",
    "faq": [
      { "q": "L'offre gratuite va-t-elle changer ?", "a": "Non. Tout ce qui est disponible aujourd'hui restera gratuit au lancement de Premium." },
      { "q": "Quand Premium sera-t-il lancé ?", "a": "Nous annoncerons la date et les tarifs par e-mail à toutes les personnes qui ont demandé à être prévenues." },
      { "q": "Comment être prévenu ?", "a": "Utilisez « Me prévenir au lancement » pour nous envoyer un message avec votre adresse e-mail." }
    ]
  },
  "help": {
    "eyebrow": "Assistance",
    "title": "Centre",
    "accent": "d'aide",
    "description": "Les réponses aux questions les plus fréquentes sur les comptes, la lecture et les langues.",
    "faqTitle": "Questions fréquentes",
    "devicesTitle": "Où regarder",
    "devicesBody": "LuminaFlix fonctionne dans tout navigateur récent, sans application à installer.",
    "devices": [
      { "title": "Ordinateur", "body": "Chrome, Edge, Firefox ou Safari, sous Windows, macOS ou Linux." },
      { "title": "Téléphone et tablette", "body": "Safari sur iOS/iPadOS et Chrome sur Android. Tournez l'appareil pour la lecture en plein écran." },
      { "title": "Télévision", "body": "Diffusez un onglet depuis Chrome, ou ouvrez le site dans le navigateur intégré de votre TV." }
    ],
    "categories": [
      {
        "title": "Compte",
        "items": [
          { "q": "Faut-il un compte pour regarder ?", "a": "Non. Vous pouvez parcourir et regarder sans compte. La connexion permet d'enregistrer des favoris, d'aimer des titres et de télécharger." },
          { "q": "Comment supprimer mon compte ?", "a": "Ouvrez le menu de votre profil, choisissez « Gérer le compte », puis « Supprimer le compte ». Vos favoris sont supprimés avec lui." }
        ]
      },
      {
        "title": "Lecture",
        "items": [
          { "q": "La vidéo ne démarre pas ou saccade.", "a": "Les flux proviennent de plusieurs serveurs. Choisissez un autre serveur sous le lecteur ; si aucun ne fonctionne, rechargez la page." },
          { "q": "Pourquoi le message « Lecture bloquée » s'affiche-t-il ?", "a": "Certaines extensions (bloqueurs de publicités, gestionnaires de téléchargement) empêchent le lecteur de se charger. Désactivez-les pour ce site et rechargez." }
        ]
      },
      {
        "title": "Langue",
        "items": [
          { "q": "Comment changer de langue ?", "a": "Utilisez le menu des langues dans la barre de navigation ou le pied de page. Votre choix est mémorisé sur cet appareil." },
          { "q": "La langue modifie-t-elle les titres et résumés ?", "a": "Oui. Les titres, résumés et genres passent dans la langue choisie lorsqu'une traduction existe." }
        ]
      }
    ],
    "stillNeedHelp": "Besoin d'aide supplémentaire ?",
    "stillNeedHelpBody": "Envoyez-nous un message, nous vous répondrons par e-mail.",
    "contactCta": "Nous contacter"
  },
  "legal": {
    "updated": "Dernière mise à jour : {date}",
    "contactPrompt": "Des questions sur cette page ?",
    "contactCta": "Nous contacter",
    "privacy": {
      "title": "Politique de",
      "accent": "confidentialité",
      "intro": "Cette politique explique quelles informations LuminaFlix collecte, pourquoi, et quels choix s'offrent à vous.",
      "sections": [
        { "title": "Informations collectées", "body": "Lorsque vous créez un compte, notre fournisseur d'authentification (Clerk) enregistre votre nom, votre adresse e-mail et votre photo de profil. Nous enregistrons les titres ajoutés à vos favoris et vos mentions « J'aime ». Lorsque vous utilisez le formulaire de contact, nous recevons votre nom, votre e-mail et votre message." },
        { "title": "Utilisation", "body": "Nous utilisons ces informations pour gérer votre compte, synchroniser vos favoris, répondre à vos messages et envoyer occasionnellement des recommandations par e-mail. Nous ne vendons pas vos données personnelles." },
        { "title": "Cookies et stockage local", "body": "Nous utilisons des cookies essentiels pour la connexion et pour mémoriser votre langue. Les statistiques (Vercel Analytics) mesurent les pages vues sans suivi intersites." },
        { "title": "Services tiers", "body": "Les informations sur les films et séries proviennent de TMDB. Les lecteurs vidéo sont fournis par des services tiers qui disposent de leurs propres politiques de confidentialité et peuvent déposer leurs propres cookies." },
        { "title": "Vos droits", "body": "Vous pouvez à tout moment accéder à vos données, les corriger ou les supprimer depuis les paramètres de votre compte, ou en nous contactant. Si vous résidez dans l'UE, vous pouvez également saisir votre autorité de protection des données (en France, la CNIL)." },
        { "title": "Conservation", "body": "Nous conservons vos données tant que votre compte est actif. La suppression du compte efface votre profil et vos favoris sous 30 jours." }
      ]
    },
    "terms": {
      "title": "Conditions",
      "accent": "d'utilisation",
      "intro": "En utilisant LuminaFlix, vous acceptez les présentes conditions. Merci de les lire attentivement.",
      "sections": [
        { "title": "Le service", "body": "LuminaFlix est un catalogue qui affiche des informations issues de TMDB et intègre des lecteurs exploités par des tiers. Nous n'hébergeons aucun fichier vidéo et ne contrôlons pas le contenu fourni par ces services." },
        { "title": "Votre compte", "body": "Vous êtes responsable de l'activité de votre compte et de la sécurité de vos identifiants. Vous devez avoir l'âge requis pour consentir au traitement de vos données dans votre pays." },
        { "title": "Utilisation acceptable", "body": "N'essayez pas de perturber le service, de l'aspirer à grande échelle ou de l'utiliser à des fins illicites. Nous pouvons suspendre les comptes concernés." },
        { "title": "Ayants droit", "body": "Si vous estimez qu'un contenu accessible via LuminaFlix porte atteinte à vos droits, contactez-nous avec les détails : nous examinerons votre demande rapidement." },
        { "title": "Limitation de responsabilité", "body": "Le service est fourni « en l'état », sans garantie de disponibilité ni d'adéquation à un usage particulier, dans les limites autorisées par la loi." },
        { "title": "Modifications", "body": "Nous pouvons modifier ces conditions. Le cas échéant, la date en haut de cette page sera mise à jour. Continuer à utiliser le service vaut acceptation des conditions modifiées." }
      ]
    }
  }
}
```

## `next.config.ts`

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // PERF: TMDB already serves pre-sized renditions from its CDN. The custom
    // loader maps each srcset width to the closest TMDB size bucket, so we get
    // responsive images without paying for (or waiting on) re-optimization.
    loader: "custom",
    loaderFile: "./lib/tmdb-image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
```

## `package.json`

```json
{
  "name": "luminaflix",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@clerk/localizations": "^3.37.0",
    "@clerk/nextjs": "^6.36.10",
    "@emailjs/nodejs": "^5.0.2",
    "@getbrevo/brevo": "^4.0.1",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-slot": "^1.2.4",
    "@vercel/analytics": "^1.6.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "firebase": "^12.8.0",
    "firebase-admin": "^13.6.0",
    "lucide-react": "^0.562.0",
    "next": "16.1.4",
    "next-intl": "^4.14.0",
    "nextjs-toploader": "^3.9.17",
    "qrcode.react": "^4.2.0",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "sonner": "^2.0.8",
    "svix": "^1.84.1",
    "tailwind-merge": "^3.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19.2.10",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9",
    "eslint-config-next": "16.1.4",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.4.0",
    "typescript": "^5"
  }
}
```

## `proxy.ts`

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, localeFromLegacyParam } from "@/i18n/config";

const isProtectedRoute = createRouteMatcher(["/wishlist(.*)", "/favorites(.*)", "/admin(.*)"]);

const LEGACY_LOCALE_PARAM = "display_lang";

export default clerkMiddleware(
  async (auth, req) => {
    // i18n: old links carried `?display_lang=fr-FR` on every URL. Strip it,
    // persist the choice in the locale cookie and redirect to the clean URL.
    const legacy = req.nextUrl.searchParams.get(LEGACY_LOCALE_PARAM);
    if (legacy !== null && req.method === "GET") {
      const url = req.nextUrl.clone();
      url.searchParams.delete(LEGACY_LOCALE_PARAM);
      const response = NextResponse.redirect(url, 308);
      const locale = localeFromLegacyParam(legacy);
      if (locale) {
        response.cookies.set(LOCALE_COOKIE, locale, {
          path: "/",
          maxAge: LOCALE_COOKIE_MAX_AGE,
          sameSite: "lax",
        });
      }
      return response;
    }

    if (isProtectedRoute(req)) await auth.protect();
  },
  {
    // AUTH FIX: protected-route redirects go to our own pages, which forward
    // `redirect_url` to Clerk so users come back to where they were.
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

## `scripts/check-locales.mjs`

```js
// Verifies every locale has exactly the same keys (and array lengths) as en.json.
// Usage: node scripts/check-locales.mjs
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../locales/", import.meta.url);
const load = (file) => JSON.parse(readFileSync(new URL(file, dir), "utf8"));

function shape(value, prefix = "", out = new Map()) {
  if (Array.isArray(value)) {
    out.set(prefix, `array(${value.length})`);
    value.forEach((item, i) => shape(item, `${prefix}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) shape(child, prefix ? `${prefix}.${key}` : key, out);
  } else {
    out.set(prefix, typeof value);
  }
  return out;
}

const reference = shape(load("en.json"));
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const current = shape(load(file));
  const missing = [...reference.keys()].filter((k) => !current.has(k));
  const extra = [...current.keys()].filter((k) => !reference.has(k));
  const mismatched = [...reference.keys()].filter((k) => current.has(k) && current.get(k) !== reference.get(k));
  if (missing.length || extra.length || mismatched.length) {
    failed = true;
    console.error(`✗ ${file}`, { missing, extra, mismatched });
  } else {
    console.log(`✓ ${file} matches en.json (${reference.size} entries)`);
  }
}
process.exit(failed ? 1 : 0);
```

## `typing.d.ts`

```ts
import { Timestamp } from "firebase/firestore";

export type Movie = {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  media_type?: "movie" | "tv" | "person";
  origin_country?: string[];
  backdrop_path: string;
  poster_path: string;
  first_air_date: string;
  overview: string;
  release_date: string;
  vote_average: number;
  original_language: string;
  original_name: string;
  adult: boolean;
  genre_ids: number[];
  popularity: number;
  video: boolean;
  vote_count: number;
  external_ids?: {
    imdb_id: string | null;
    wikidata_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
};

export type TMDBResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

export type Genre = {
  id: number;
  name: string;
};

export type GenreResponse = {
  genres: Genre[];
};

export type AnimeEpisode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string;
  air_date: string;
};

export type AnimeSeason = {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string;
  episodes?: AnimeEpisode[]; // Loaded when a season is selected
};

export type AnimeDetail = {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  seasons: AnimeSeason[];
};

export type User = {
  clerkId: string;
  createdAt: Timestamp;
  email: string;
  firstName: string;
  fullName: string;
  lastActive: Timestamp;
  lastName: string;
  profileImage: string;
  role?: null | "ADMIN";
};
```

## `action/daily-sync.action.ts`

```ts
// SECURITY: no longer a "use server" module. As a server action,
// triggerDailySync (which emails every user) was exposed as a callable
// endpoint; it is now only reachable through the authenticated cron route.
import "server-only";
import { BrevoClient } from "@getbrevo/brevo";
import { getAllMovies } from "@/action/get-all-movies.action";
import { db } from "@/lib/firebase-admin";
import type { Movie, TMDBResponse } from "@/typing";
import { getAllKDramas } from "./get-all-kdramas.action";
import { getAllAnime } from "./get-all-anime.action";

const IS_PROD = process.env.NODE_ENV === "production";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY!,
});

/** Escapes TMDB / user strings before interpolating them into HTML. */
const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string,
  );

const truncate = (text: string | undefined, length: number) =>
  escapeHtml(text && text.length > length ? text.substring(0, length) + "..." : text);

const getRandomItem = (data: TMDBResponse): Movie | null => {
  if (!data?.results || data.results.length === 0) return null;
  const randomIndex = Math.floor(
    Math.random() * Math.min(data.results.length, 15),
  );
  return data.results[randomIndex];
};

export async function triggerDailySync() {
  const domain = IS_PROD
    ? process.env.NEXT_PUBLIC_DOMAIN
    : "http://localhost:3000";

  try {
    // Generate a random page between 1 and 100 for each category
    const moviePage = Math.floor(Math.random() * 50) + 1;
    const dramaPage = Math.floor(Math.random() * 50) + 1;
    const animePage = Math.floor(Math.random() * 50) + 1;

    const [movieData, dramaData, animeData] = await Promise.all([
      getAllMovies(moviePage, "popularity.desc", "all", "all", "movie"),
      getAllKDramas(dramaPage, "popularity.desc", "all", "all"),
      getAllAnime(animePage, "popularity.desc", "all", "all"),
    ]);

    const m = getRandomItem(movieData);
    const d = getRandomItem(dramaData);
    const a = getRandomItem(animeData);

    const usersSnap = await db.collection("USERS").get();
    const recipients = usersSnap.docs
      .map((doc) => doc.data() as { email?: string; firstName?: string })
      .filter((user) => !!user.email);

    if (IS_PROD) {
      const emailPromises = recipients.map((user) => {
        return brevo.transactionalEmails.sendTransacEmail({
          subject: `[LUMINA] ⚡ Daily Transmission | Intelligence Update`,
          sender: { email: "tojorandria474@gmail.com", name: "Lumina" },
          to: [{ email: user.email as string, name: user.firstName }],
          cc: [{ email: "tojorandriaii474@gmail.com", name: "Ops Manager" }],
          htmlContent: `<div style="background-color: #020405; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;">
            <div style="max-width: 600px; margin: auto; background: #05080a; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);">
              
              <div style="padding: 16px 24px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 6px; height: 6px; background: #06b6d4; border-radius: 50%; box-shadow: 0 0 8px #06b6d4;"></div>
                  <span style="color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8;">Secure Stream Active</span>
                </div>
                <span style="color: #475569; font-size: 10px; font-weight: 500; font-family: monospace; margin-left: 7px;">${new Date().toISOString().replace("T", " // ").slice(0, 19)}</span>
              </div>

              <div style="position: relative; padding: 40px 30px; background: linear-gradient(180deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%);">
                <h1 style="margin: 0; font-size: 12px; font-weight: 800; color: #06b6d4; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 12px;">LUMINA OS</h1>
                <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">Intercepting new <br/>visual signals for <span style="color: #06b6d4;">${escapeHtml(user.firstName || "Operative")}</span>.</h2>
              </div>

              <div style="padding: 0 24px 32px 24px;">
                <div style="background: #0d1117; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
                  <div style="position: relative;">
                    <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block;" />
                    <div style="position: absolute; inset: 0; background: linear-gradient(to top, #0d1117 0%, transparent 50%);"></div>
                    <div style="position: absolute; bottom: 20px; left: 20px;">
                      <span style="background: #ffffff; color: #000000; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">Top Priority</span>
                    </div>
                  </div>
                  
                  <div style="padding: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${escapeHtml(m?.title)}</h3>
                    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">${truncate(m?.overview, 140)}</p>
                    
                    <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4);">
                      Initialize Link →
                    </a>
                  </div>
                </div>
              </div>

              <div style="padding: 0 24px 40px 24px;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="48%" valign="top">
                      <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                        <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                        <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">K-Drama</p>
                        <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${escapeHtml(d?.name)}</h4>
                        <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                      </div>
                    </td>
                    <td width="4%"></td>
                    <td width="48%" valign="top">
                      <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                        <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                        <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Anime</p>
                        <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${escapeHtml(a?.name)}</h4>
                        <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="padding: 32px 24px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
                <div style="margin-bottom: 16px;">
                  <span style="color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">LUMINA_PROTOCOL // ENCRYPTED</span>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                  <a href="#" style="color: #64748b; text-decoration: none;">Security Settings</a>
                  <span style="margin: 0 10px; opacity: 0.2;">|</span>
                  <a href="#" style="color: #64748b; text-decoration: none;">End Session</a>
                </div>
              </div>
            </div>
          </div>`,
        });
      });
      await Promise.all(emailPromises);
      return { success: true, count: recipients.length };
    } else {
      await brevo.transactionalEmails.sendTransacEmail({
        subject: `[LUMINA] New Signals Intercepted: ${m?.title || "Update"}`,
        sender: { email: "tojorandria474@gmail.com", name: "Lumina" },
        to: [{ email: "tojorandriaii474@gmail.com", name: "Developer" }],
        cc: [{ email: "joodev08@gmail.com", name: "Ops Manager" }],
        htmlContent: `<div style="background-color: #020405; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;">
        <div style="max-width: 600px; margin: auto; background: #05080a; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.05); overflow: hidden; box-shadow: 0 50px 100px -20px rgba(0,0,0,0.7);">
          
          <div style="padding: 16px 24px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 6px; height: 6px; background: #06b6d4; border-radius: 50%; box-shadow: 0 0 8px #06b6d4;"></div>
              <span style="color: #ffffff; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.8;">Secure Stream Active</span>
            </div>
            <span style="color: #475569; font-size: 10px; font-weight: 500; font-family: monospace; margin-left: 7px;">${new Date().toISOString().replace("T", " // ").slice(0, 19)}</span>
          </div>

          <div style="position: relative; padding: 40px 30px; background: linear-gradient(180deg, rgba(6, 182, 212, 0.05) 0%, transparent 100%);">
            <h1 style="margin: 0; font-size: 12px; font-weight: 800; color: #06b6d4; text-transform: uppercase; letter-spacing: 5px; margin-bottom: 12px;">LUMINA OS</h1>
            <h2 style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1.1;">Intercepting new <br/>visual signals for <span style="color: #06b6d4;">Tooj</span>.</h2>
          </div>

          <div style="padding: 0 24px 32px 24px;">
            <div style="background: #0d1117; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden;">
              <div style="position: relative;">
                <img src="https://image.tmdb.org/t/p/w780${m?.backdrop_path || m?.poster_path}" style="width: 100%; display: block;" />
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, #0d1117 0%, transparent 50%);"></div>
                <div style="position: absolute; bottom: 20px; left: 20px;">
                  <span style="background: #ffffff; color: #000000; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase;">Top Priority</span>
                </div>
              </div>
              
              <div style="padding: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff; font-weight: 700;">${escapeHtml(m?.title)}</h3>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">${truncate(m?.overview, 140)}</p>
                
                <a href="${domain}/movies/${m?.id}" style="display: inline-block; background: #06b6d4; color: #ffffff; padding: 14px 32px; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 10px 20px -5px rgba(6, 182, 212, 0.4);">
                  Initialize Link →
                </a>
              </div>
            </div>
          </div>

          <div style="padding: 0 24px 40px 24px;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="48%" valign="top">
                  <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                    <img src="https://image.tmdb.org/t/p/w500${d?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                    <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">K-Drama</p>
                    <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${escapeHtml(d?.name)}</h4>
                    <a href="${domain}/k-drama/${d?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" valign="top">
                  <div style="background: rgba(255, 255, 255, 0.02); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px;">
                    <img src="https://image.tmdb.org/t/p/w500${a?.poster_path}" style="width: 100%; border-radius: 8px; margin-bottom: 12px;" />
                    <p style="color: #06b6d4; font-size: 9px; font-weight: 800; text-transform: uppercase; margin: 0 0 4px 0;">Anime</p>
                    <h4 style="font-size: 14px; color: #ffffff; margin: 0 0 12px 0; font-weight: 600; line-height: 1.3;">${escapeHtml(a?.name)}</h4>
                    <a href="${domain}/anime/${a?.id}" style="color: #ffffff; font-size: 11px; font-weight: 700; text-decoration: none; opacity: 0.6; border-bottom: 1px solid #06b6d4;">Sync Files</a>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 32px 24px; background: rgba(255, 255, 255, 0.02); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
            <div style="margin-bottom: 16px;">
              <span style="color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">LUMINA_PROTOCOL // ENCRYPTED</span>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              <a href="#" style="color: #64748b; text-decoration: none;">Security Settings</a>
              <span style="margin: 0 10px; opacity: 0.2;">|</span>
              <a href="#" style="color: #64748b; text-decoration: none;">End Session</a>
            </div>
          </div>
        </div>
        </div>`,
      });
      return { success: true, count: 1 };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[daily-sync] Brevo error:", message);
    return { success: false, error: message };
  }
}
```

## `action/get-all-anime.action.ts`

```ts
import { resolveSort } from "@/lib/filters";
import { EMPTY_PAGE, REVALIDATE, tmdb, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllAnime(
  page = 1,
  sortBy = "popularity.desc",
  genreId = "all",
  year = "all",
): Promise<TMDBResponse> {
  // Genre 16 = Animation; origin JP + original language ja narrows to anime.
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv", "popularity.desc"),
      page,
      with_genres: genreId !== "all" && /^\d+$/.test(genreId) ? genreId : "16",
      with_origin_country: "JP",
      with_original_language: "ja",
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
```

## `action/get-all-genres.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Genre, GenreResponse, TMDBResponse } from "@/typing";

/** Movie + TV genres merged and de-duplicated (cached for a day). */
export async function getGenreList(): Promise<Genre[]> {
  const [movie, tv] = await Promise.all([
    tmdb<GenreResponse>("/genre/movie/list", {}, { revalidate: REVALIDATE.long }),
    tmdb<GenreResponse>("/genre/tv/list", {}, { revalidate: REVALIDATE.long }),
  ]);
  const unique = new Map<number, Genre>();
  for (const genre of [...(movie?.genres ?? []), ...(tv?.genres ?? [])]) {
    unique.set(genre.id, genre);
  }
  return [...unique.values()];
}

/**
 * PERF: /genres/[id] used to call getAllGenres() — ~27 uncached discover
 * requests — only to print one genre name. This reads the cached list.
 */
export async function getGenreName(id: string): Promise<string | null> {
  const genres = await getGenreList();
  return genres.find((genre) => String(genre.id) === id)?.name ?? null;
}

export async function getAllGenres(): Promise<(Genre & { backdrop: string | null })[]> {
  const genres = await getGenreList();

  // One backdrop per genre. The artwork doesn't depend on the language, so
  // it is fetched unlocalized and cached for a day across all users.
  const withImages = await Promise.all(
    genres.map(async (genre) => {
      const discover = await tmdb<TMDBResponse>(
        "/discover/movie",
        { with_genres: genre.id, sort_by: "popularity.desc", page: 1 },
        { revalidate: REVALIDATE.long, localized: false },
      );
      return { ...genre, backdrop: discover?.results?.[0]?.backdrop_path ?? null };
    }),
  );

  return withImages.sort((a, b) => a.name.localeCompare(b.name));
}
```

## `action/get-all-kdramas.action.ts`

```ts
import { resolveSort } from "@/lib/filters";
import { EMPTY_PAGE, REVALIDATE, genreParams, tmdb, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllKDramas(
  page = 1,
  sortBy = "popularity.desc",
  genreId = "all",
  year = "all",
): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv", "popularity.desc"),
      page,
      with_original_language: "ko",
      with_origin_country: "KR",
      ...genreParams(genreId),
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
```

## `action/get-all-movies.action.ts`

```ts
import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllMovies(
  page = 1,
  sortBy?: string,
  genreId?: string,
  year?: string,
  type: "movie" | "tv" = "movie",
): Promise<TMDBResponse> {
  const endpoint = type === "tv" ? "tv" : "movie";
  const data = await tmdb<TMDBResponse>(
    `/discover/${endpoint}`,
    {
      sort_by: resolveSort(sortBy, endpoint),
      page,
      include_adult: true,
      "vote_count.gte": 50,
      ...genreParams(genreId),
      ...yearParams(year, endpoint),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
```

## `action/get-all-tv.action.ts`

```ts
import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getAllTVShows(
  page = 1,
  sortBy?: string,
  genreId?: string,
  year?: string,
): Promise<TMDBResponse> {
  // BUG FIX: the URL previously contained "&&sort_by" and the year filter
  // compared against "All" while the UI could send other casings.
  const data = await tmdb<TMDBResponse>(
    "/discover/tv",
    {
      sort_by: resolveSort(sortBy, "tv"),
      page,
      include_adult: true,
      "vote_count.gte": 50,
      ...genreParams(genreId),
      ...yearParams(year, "tv"),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
```

## `action/get-anime-details.action.ts`

```ts
import { getKDramaDetails, getSeasonEpisodes } from "./get-kdrama-details.action";

// Anime are TMDB TV series: same endpoints as the generic series details.
export async function getAnimeDetails(id: string) {
  return getKDramaDetails(id);
}

export async function getAnimeSeasonEpisodes(seriesId: string, seasonNumber: number) {
  return getSeasonEpisodes(seriesId, seasonNumber);
}
```

## `action/get-fallback-movies.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getFallbackMovie(query: string): Promise<Movie[]> {
  if (!query) return [];
  const data = await tmdb<TMDBResponse>("/search/movie", { query, page: 1 }, { revalidate: REVALIDATE.default });
  return data?.results ?? [];
}
```

## `action/get-favorites.action.ts`

```ts
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase-admin";
import { REVALIDATE, tmdb } from "@/lib/tmdb";

export type FavoriteType = "MOVIE" | "K_DRAMA" | "ANIME";

interface StoredFavorite {
  id: string;
  type: FavoriteType;
  season: number | null;
  episode: number | null;
  created_date: string;
}

interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export interface FavoriteItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  episode_title: string | null;
  savedType: FavoriteType;
  savedSeason: number | null;
  savedEpisode: number | null;
  created_date: string;
}

export async function getUserFavorites(): Promise<{ results: FavoriteItem[]; total_results: number }> {
  const { userId } = await auth();
  if (!userId) return { results: [], total_results: 0 };

  try {
    const snapshot = await db.collection("FAVORITE").doc(userId).get();
    const favorites = (snapshot.data()?.favorites ?? []) as StoredFavorite[];

    const hydrated = await Promise.all(
      favorites.map(async (fav): Promise<FavoriteItem | null> => {
        const mediaType = fav.type === "MOVIE" ? "movie" : "tv";
        const isEpisode = fav.type !== "MOVIE" && fav.season && fav.episode;

        // Details and episode title are fetched in parallel (was sequential).
        const [details, episode] = await Promise.all([
          tmdb<MediaDetails>(`/${mediaType}/${fav.id}`, {}, { revalidate: REVALIDATE.default }),
          isEpisode
            ? tmdb<{ name?: string }>(
                `/tv/${fav.id}/season/${fav.season}/episode/${fav.episode}`,
                {},
                { revalidate: REVALIDATE.default },
              )
            : Promise.resolve(null),
        ]);
        if (!details) return null;

        return {
          id: details.id,
          title: details.title || details.name || "",
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          vote_average: details.vote_average ?? 0,
          release_date: details.release_date || details.first_air_date || "",
          episode_title: episode?.name ?? null,
          savedType: fav.type,
          savedSeason: fav.season,
          savedEpisode: fav.episode,
          created_date: fav.created_date,
        };
      }),
    );

    const results = hydrated
      .filter((item): item is FavoriteItem => item !== null)
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    return { results, total_results: results.length };
  } catch (error) {
    console.error("[favorites] failed to load", error);
    return { results: [], total_results: 0 };
  }
}
```

## `action/get-featured.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/** "Coup de coeur": the best rated title that has a backdrop. */
export async function getFeatured(): Promise<Movie | null> {
  const data = await tmdb<TMDBResponse>("/movie/top_rated", { page: 1 }, { revalidate: REVALIDATE.long });
  return data?.results.find((movie) => movie.backdrop_path) ?? null;
}
```

## `action/get-genres.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Genre, GenreResponse, TMDBResponse } from "@/typing";

export type GenreWithStats = Genre & { count: number; poster: string };

/** Home page genre tiles: name + title count + a representative poster. */
export async function getGenres(limit = 5): Promise<GenreWithStats[]> {
  const data = await tmdb<GenreResponse>("/genre/movie/list", {}, { revalidate: REVALIDATE.long });
  if (!data?.genres) return [];

  return Promise.all(
    data.genres.slice(0, limit).map(async (genre) => {
      const discover = await tmdb<TMDBResponse>(
        "/discover/movie",
        { with_genres: genre.id },
        { revalidate: REVALIDATE.long, localized: false },
      );
      return {
        ...genre,
        count: discover?.total_results ?? 0,
        poster: discover?.results[0]?.poster_path ?? "",
      };
    }),
  );
}
```

## `action/get-kdrama-details.action.ts`

```ts
"use server";

import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { AnimeEpisode } from "@/typing";

export interface SeriesDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  origin_country?: string[];
  seasons: { id: number; season_number: number; name: string; episode_count: number }[];
}

const isId = (value: string) => /^\d+$/.test(value);

export async function getKDramaDetails(id: string) {
  if (!isId(id)) return null;
  return tmdb<SeriesDetails>(`/tv/${id}`, {}, { revalidate: REVALIDATE.default });
}

/**
 * Called from <EpisodeExplorer /> (client) when switching seasons — this is
 * why the module stays a server action. The language follows the user's
 * locale cookie automatically.
 */
export async function getSeasonEpisodes(
  seriesId: string,
  seasonNumber: number,
): Promise<AnimeEpisode[]> {
  if (!isId(seriesId) || !Number.isInteger(seasonNumber) || seasonNumber < 0) return [];
  const data = await tmdb<{ episodes?: AnimeEpisode[] }>(
    `/tv/${seriesId}/season/${seasonNumber}`,
    {},
    { revalidate: REVALIDATE.default },
  );
  return data?.episodes ?? [];
}
```

## `action/get-latest-movies.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getLatestMovies(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/movie/now_playing", { page: 1 }, { revalidate: REVALIDATE.short });
  return data?.results ?? [];
}
```

## `action/get-library.action.ts`

```ts
import { resolveSort } from "@/lib/filters";
import { REVALIDATE, genreParams, tmdb, withPosters } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getLibrary(
  page = 1,
  sortBy = "vote_average.desc",
  genreId?: string,
): Promise<TMDBResponse> {
  // Library = well-established films (500+ votes).
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    {
      sort_by: resolveSort(sortBy, "movie", "vote_average.desc"),
      page,
      "vote_count.gte": 500,
      include_adult: true,
      ...genreParams(genreId),
    },
    { revalidate: REVALIDATE.default },
  );
  return withPosters(data);
}
```

## `action/get-movie-data.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";

export interface MovieDetails {
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
```

## `action/get-movie-trailer.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";

interface Video {
  key: string;
  site: string;
  type: string;
  iso_639_1: string;
}

const pickTrailer = (videos: Video[]) =>
  videos.find((v) => v.type === "Trailer" && v.site === "YouTube") ??
  videos.find((v) => v.type === "Teaser" && v.site === "YouTube") ??
  videos.find((v) => v.site === "YouTube");

export async function getMovieTrailer(id: string, requestedLang?: string, type?: string) {
  if (!/^\d+$/.test(id)) return null;
  const language = requestedLang === "en" ? "en-US" : "fr-FR";
  const primary: "movie" | "tv" = type === "anime" || type === "tv" || type === "k-drama" ? "tv" : "movie";
  const secondary = primary === "movie" ? "tv" : "movie";

  const fetchVideos = async (mediaType: "movie" | "tv", lang: string) => {
    const data = await tmdb<{ results?: Video[] }>(
      `/${mediaType}/${id}/videos`,
      { language: lang },
      { revalidate: REVALIDATE.long, localized: false },
    );
    return data?.results?.length ? pickTrailer(data.results) : undefined;
  };

  // BUG FIX: the English fallback always tried "movie" first, even for series.
  const trailer =
    (await fetchVideos(primary, language)) ??
    (await fetchVideos(secondary, language)) ??
    (language !== "en-US"
      ? (await fetchVideos(primary, "en-US")) ?? (await fetchVideos(secondary, "en-US"))
      : undefined);

  return trailer ? { key: trailer.key, lang: trailer.iso_639_1 } : null;
}
```

## `action/get-movies-by-genre.action.ts`

```ts
import { EMPTY_PAGE, REVALIDATE, genreParams, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getMoviesByGenre(genreId: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    { sort_by: "popularity.desc", page, ...genreParams(genreId) },
    { revalidate: REVALIDATE.default },
  );
  return data ?? EMPTY_PAGE;
}
```

## `action/get-new-popular.action.ts`

```ts
import { REVALIDATE, genreParams, tmdb, withPosters, yearParams } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getNewAndPopular(
  page = 1,
  genreId?: string,
  year?: string,
): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/discover/movie",
    {
      sort_by: "popularity.desc",
      page,
      include_adult: true,
      "vote_count.gte": 100,
      ...genreParams(genreId),
      ...yearParams(year, "movie"),
    },
    { revalidate: REVALIDATE.short },
  );
  return withPosters(data);
}
```

## `action/get-search-anime.action.ts`

```ts
import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getSearchAnime(query: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/search/tv",
    { query, page, include_adult: true },
    { revalidate: REVALIDATE.default },
  );
  if (!data) return EMPTY_PAGE;
  const results = data.results.filter(
    (item) =>
      item.genre_ids?.includes(16) &&
      (item.origin_country?.includes("JP") || item.original_language === "ja"),
  );
  return { ...data, results, total_results: results.length };
}
```

## `action/get-search-kdrama.action.ts`

```ts
import { EMPTY_PAGE, REVALIDATE, tmdb } from "@/lib/tmdb";
import type { TMDBResponse } from "@/typing";

export async function getSearchKDramas(query: string, page = 1): Promise<TMDBResponse> {
  const data = await tmdb<TMDBResponse>(
    "/search/tv",
    { query, page, include_adult: true },
    { revalidate: REVALIDATE.default },
  );
  if (!data) return EMPTY_PAGE;
  const results = data.results.filter(
    (item) => item.origin_country?.includes("KR") || item.original_language === "ko",
  );
  return { ...data, results, total_results: results.length };
}
```

## `action/get-search-results.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getSearchResults(query: string, genreId?: string): Promise<Movie[]> {
  const trimmed = query?.trim();
  const genre = genreId && genreId !== "all" ? Number(genreId) : null;

  let data: TMDBResponse | null = null;
  if (trimmed) {
    data = await tmdb<TMDBResponse>(
      "/search/multi",
      { query: trimmed, include_adult: true },
      { revalidate: REVALIDATE.default },
    );
  } else if (genre) {
    // BUG FIX: the genre was previously commented out of this request.
    data = await tmdb<TMDBResponse>(
      "/discover/movie",
      { sort_by: "popularity.desc", with_genres: genre },
      { revalidate: REVALIDATE.default },
    );
  } else {
    return [];
  }

  let results = (data?.results ?? []).filter((item) => item.media_type !== "person");
  // /search/multi has no genre filter, so apply it locally.
  if (trimmed && genre) results = results.filter((item) => item.genre_ids?.includes(genre));
  return results;
}
```

## `action/get-top-rated-movies.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getTopRatedMovies(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/movie/top_rated", { page: 1 }, { revalidate: REVALIDATE.long });
  return data?.results ?? [];
}
```

## `action/get-trending-TV.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

export async function getTrendingTV(): Promise<Movie[]> {
  const data = await tmdb<TMDBResponse>("/trending/tv/week", {}, { revalidate: REVALIDATE.short });
  return data?.results.slice(0, 10) ?? [];
}
```

## `action/get-trending-hero.action.ts`

```ts
import { REVALIDATE, tmdb } from "@/lib/tmdb";
import type { Movie, TMDBResponse } from "@/typing";

/**
 * Picks a random trending page so the hero changes between visits. Each page
 * is cached individually, so the randomness no longer costs an uncached
 * request on every page view.
 */
export async function getTrendingHero(): Promise<Movie[]> {
  const randomPage = Math.floor(Math.random() * 20) + 1;
  const data = await tmdb<TMDBResponse>(
    "/trending/movie/day",
    { page: randomPage },
    { revalidate: REVALIDATE.short },
  );
  return (data?.results ?? []).filter((movie) => movie.backdrop_path);
}
```

## `action/send-contact-message.action.ts`

```ts
"use server";

import { BrevoClient } from "@getbrevo/brevo";
import { headers } from "next/headers";
import {
  normalizeContact,
  validateContact,
  type ContactFormState,
} from "@/lib/contact";

/**
 * Contact form → transactional email via Brevo (already used by the daily
 * digest, so no new provider or API key is needed).
 *
 * Env:
 * - BREVO_API_KEY       (required)
 * - CONTACT_TO_EMAIL    recipient, defaults to tojorandria474@gmail.com
 * - CONTACT_FROM_EMAIL  sender; must be a sender verified in Brevo
 *
 * Abuse protection: hidden honeypot field, minimum fill time, per-IP rate
 * limit, strict length limits and HTML escaping. The recipient address is
 * never sent to the browser.
 */
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "tojorandria474@gmail.com";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";
const FROM_NAME = "LuminaFlix Contact";

const MIN_FILL_MS = 3000;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

// Best-effort, per server instance. Use Upstash/Redis for a global limit.
const hits = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return false;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = normalizeContact({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  // Bots fill every field and submit instantly.
  const honeypot = formData.get("company");
  const startedAt = Number(formData.get("startedAt"));
  if ((typeof honeypot === "string" && honeypot.length > 0) || !startedAt || Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "error", error: "spam", values };
  }

  const fieldErrors = validateContact(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", error: "fixFields", fieldErrors, values };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) {
    return { status: "error", error: "rateLimited", values };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[contact] BREVO_API_KEY is not set");
    return { status: "error", error: "config", values };
  }

  const locale = h.get("accept-language")?.split(",")[0] ?? "unknown";
  const safe = {
    name: escapeHtml(values.name),
    email: escapeHtml(values.email),
    subject: escapeHtml(values.subject),
    message: escapeHtml(values.message).replace(/\n/g, "<br>"),
  };

  const htmlContent = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#000;padding:20px 24px;color:#fff;font-size:18px;font-weight:bold">
      Lumina<span style="color:#06b6d4">Flix</span> · New contact message
    </td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">From</p>
      <p style="margin:0 0 16px;font-size:15px"><strong>${safe.name}</strong> &lt;<a href="mailto:${safe.email}">${safe.email}</a>&gt;</p>
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">Subject</p>
      <p style="margin:0 0 16px;font-size:15px">${safe.subject}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">Message</p>
      <div style="font-size:15px;line-height:1.6;padding:16px;background:#fafafa;border-left:3px solid #06b6d4">${safe.message}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa">Reply directly to this email to answer ${safe.name}. · Browser language: ${escapeHtml(locale)}</p>
    </td></tr>
  </table>
</body></html>`;

  const textContent = `New contact message (LuminaFlix)

From: ${values.name} <${values.email}>
Subject: ${values.subject}

${values.message}`;

  try {
    const brevo = new BrevoClient({ apiKey });
    await brevo.transactionalEmails.sendTransacEmail({
      subject: `[LuminaFlix Contact] ${values.subject}`,
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: TO_EMAIL, name: "LuminaFlix" }],
      replyTo: { email: values.email, name: values.name },
      htmlContent,
      textContent,
    });
    return { status: "success", name: values.name, email: values.email };
  } catch (error) {
    console.error("[contact] Brevo error:", error instanceof Error ? error.message : error);
    return { status: "error", error: "server", values };
  }
}
```

## `action/stream-actions.ts`

```ts
"use server";

import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { db } from "@/lib/firebase-admin";

type MediaType = "MOVIE" | "K_DRAMA" | "ANIME";
const MEDIA_TYPES: MediaType[] = ["MOVIE", "K_DRAMA", "ANIME"];

interface MediaRef {
  mediaId: string;
  type: MediaType;
  season?: number | null;
  episode?: number | null;
}

type ActionResult = { success: true; added?: boolean } | { success: false; error: "UNAUTHORIZED" | "INVALID" | "FAILED" };

/**
 * BUG FIX: movies are always stored with season/episode = null. Previously a
 * caller passing a season for a MOVIE created a duplicate entry because the
 * existence check compared against the raw value.
 */
function normalize({ mediaId, type, season, episode }: MediaRef) {
  if (!MEDIA_TYPES.includes(type) || !/^\d+$/.test(String(mediaId))) return null;
  const isMovie = type === "MOVIE";
  const s = isMovie ? null : Number(season ?? NaN);
  const e = isMovie ? null : Number(episode ?? NaN);
  if (!isMovie && (!Number.isInteger(s) || !Number.isInteger(e))) return null;
  return { mediaId: String(mediaId), type, season: s, episode: e };
}

export async function handleMediaReaction(
  input: MediaRef & { action: "like" | "dislike" },
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref || (input.action !== "like" && input.action !== "dislike")) {
    return { success: false, error: "INVALID" };
  }

  const docId = ref.type === "MOVIE" ? ref.mediaId : `${ref.mediaId}_S${ref.season}_E${ref.episode}`;
  const docRef = db.collection(ref.type).doc(docId);
  const { arrayUnion, arrayRemove } = admin.firestore.FieldValue;

  try {
    // Transaction: two quick clicks can no longer interleave read/write.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.data() ?? {};
      const likes: string[] = data.likes ?? [];
      const dislikes: string[] = data.dislikes ?? [];

      if (!snap.exists) {
        tx.set(docRef, {
          likes: input.action === "like" ? [userId] : [],
          dislikes: input.action === "dislike" ? [userId] : [],
        });
        return;
      }

      if (input.action === "like") {
        tx.update(
          docRef,
          likes.includes(userId)
            ? { likes: arrayRemove(userId) }
            : { likes: arrayUnion(userId), dislikes: arrayRemove(userId) },
        );
      } else {
        tx.update(
          docRef,
          dislikes.includes(userId)
            ? { dislikes: arrayRemove(userId) }
            : { dislikes: arrayUnion(userId), likes: arrayRemove(userId) },
        );
      }
    });
    return { success: true };
  } catch (error) {
    console.error("[reactions] failed", error);
    return { success: false, error: "FAILED" };
  }
}

export async function toggleFavorite(input: MediaRef): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref) return { success: false, error: "INVALID" };

  const docRef = db.collection("FAVORITE").doc(userId);

  try {
    const added = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const favorites: { id: string; type: MediaType; season: number | null; episode: number | null }[] =
        snap.data()?.favorites ?? [];

      const exists = favorites.some(
        (fav) =>
          String(fav.id) === ref.mediaId &&
          fav.type === ref.type &&
          (fav.season ?? null) === ref.season &&
          (fav.episode ?? null) === ref.episode,
      );

      const next = exists
        ? favorites.filter(
            (fav) =>
              !(
                String(fav.id) === ref.mediaId &&
                fav.type === ref.type &&
                (fav.season ?? null) === ref.season &&
                (fav.episode ?? null) === ref.episode
              ),
          )
        : [
            ...favorites,
            {
              id: ref.mediaId,
              type: ref.type,
              season: ref.season,
              episode: ref.episode,
              created_date: new Date().toISOString(),
            },
          ];

      tx.set(docRef, { favorites: next }, { merge: true });
      return !exists;
    });
    return { success: true, added };
  } catch (error) {
    console.error("[favorites] toggle failed", error);
    return { success: false, error: "FAILED" };
  }
}
```

## `components/ads/native-banner-ad.tsx`

```tsx
"use client";

const NativeBannerAd = () => {

  return (
    <div
      className="w-full min-h-25 flex justify-center items-center overflow-hidden text-muted-foreground"
    >
      Ad has been removed to fulfill user&apos;s request.
    </div>
  );
};

export default NativeBannerAd;
```

## `components/auth/auth-page.tsx`

```tsx
import { headers } from "next/headers";
import { sanitizeReturnTo } from "@/lib/auth-redirect";
import { Container } from "@/components/layout/container";

export type AuthSearchParams = Promise<{
  redirect_url?: string | string[];
  /** Legacy parameter used by the old download button. */
  fallback_redirect_url?: string | string[];
}>;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

/**
 * Resolves the page the user should return to after signing in / up.
 * Only same-origin paths are accepted (no open redirects).
 */
export async function resolveReturnTo(searchParams: AuthSearchParams): Promise<string> {
  const sp = await searchParams;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : undefined;

  return (
    sanitizeReturnTo(first(sp.redirect_url), origin) ??
    sanitizeReturnTo(first(sp.fallback_redirect_url), origin) ??
    "/"
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-black pt-28 pb-16 sm:pt-32">
      <Container className="flex justify-center">{children}</Container>
    </main>
  );
}
```

## `components/auth/post-auth-redirect.tsx`

```tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeReturnTo, getCurrentLocation } from "@/lib/auth-redirect";

const LANDING_ROUTES = /^\/($|sign-in|sign-up)/;

/**
 * Safety net for the auth redirect. If Clerk ever drops the destination
 * (OAuth edge cases, email-link sign-in opened in the same tab, …) and the
 * user lands on `/` or an auth route right after signing in, send them back
 * to the page stored by `useAuthGate()`. The stored value expires after 15
 * minutes and is cleared as soon as it's read.
 */
export default function PostAuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const target = consumeReturnTo();
    if (target && target !== getCurrentLocation() && LANDING_ROUTES.test(pathname)) {
      router.replace(target);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
```

## `components/auth/sign-in-link.tsx`

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildSignInHref, getCurrentLocation, rememberReturnTo } from "@/lib/auth-redirect";

/**
 * Navbar "Sign in" / "Join" links. The destination is computed at click time
 * (so it always includes the current query string) and passed as
 * `redirect_url`, which Clerk carries through sign-in ↔ sign-up and OAuth.
 */
export default function SignInLink({
  route = "/sign-in",
  className,
  children,
  onNavigate,
}: {
  route?: "/sign-in" | "/sign-up";
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  return (
    <Link
      href={route}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        const returnTo = getCurrentLocation();
        rememberReturnTo(returnTo);
        onNavigate?.();
        router.push(buildSignInHref(returnTo, route));
      }}
    >
      {children}
    </Link>
  );
}
```

## `components/contact/contact-form.tsx`

```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendContactMessage } from "@/action/send-contact-message.action";
import {
  CONTACT_LIMITS,
  normalizeContact,
  validateContact,
  validateContactField,
  type ContactErrors,
  type ContactField,
  type ContactFormState,
  type ContactValues,
} from "@/lib/contact";
import { cn } from "@/lib/utils";

const INITIAL_STATE: ContactFormState = { status: "idle" };

const inputBase =
  "w-full rounded-2xl border bg-zinc-900/60 px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60";

export default function ContactForm({ defaultSubject = "" }: { defaultSubject?: string }) {
  const t = useTranslations("contact");
  const [state, formAction, isPending] = useActionState(sendContactMessage, INITIAL_STATE);

  const [values, setValues] = useState<ContactValues>({ name: "", email: "", subject: defaultSubject, message: "" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastState = useRef<ContactFormState>(INITIAL_STATE);

  // Set on the client only (avoids a hydration mismatch); used as a time-trap.
  useEffect(() => setStartedAt(Date.now()), []);

  // React to each new server response exactly once.
  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;

    if (state.status === "success") {
      toast.success(t("success.title"), { description: t("success.body", { name: state.name, email: state.email }) });
      setShowSuccess(true);
      setValues({ name: "", email: "", subject: "", message: "" });
      setErrors({});
      setTouched({});
    } else if (state.status === "error") {
      toast.error(t(`errors.${state.error}`));
      if (state.fieldErrors) {
        setErrors(state.fieldErrors);
        setTouched({ name: true, email: true, subject: true, message: true });
      }
    }
  }, [state, t]);

  const update = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    // Re-validate live once the field has been visited.
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateContactField(field, normalizeContact({ [field]: value })[field]) }));
    }
  };

  const blur = (field: ContactField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateContactField(field, normalizeContact(values)[field]) }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const clientErrors = validateContact(normalizeContact(values));
    if (Object.keys(clientErrors).length > 0) {
      e.preventDefault();
      setErrors(clientErrors);
      setTouched({ name: true, email: true, subject: true, message: true });
      toast.error(t("errors.fixFields"));
      const first = (["name", "email", "subject", "message"] as const).find((f) => clientErrors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  };

  if (showSuccess && state.status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-5 rounded-4xl border border-cyan-500/20 bg-cyan-500/5 px-6 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-cyan-500" aria-hidden />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{t("success.title")}</h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          {t("success.body", { name: state.name, email: state.email })}
        </p>
        <button
          type="button"
          onClick={() => {
            setShowSuccess(false);
            setStartedAt(Date.now());
          }}
          className="cursor-pointer rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:border-cyan-500 hover:text-cyan-400"
        >
          {t("success.again")}
        </button>
      </div>
    );
  }

  const fieldError = (field: ContactField) => (touched[field] ? errors[field] : undefined);

  const renderError = (field: ContactField) => {
    const error = fieldError(field);
    if (!error) return null;
    return (
      <p id={`${field}-error`} className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t(`errors.${error}`)}
      </p>
    );
  };

  const fieldProps = (field: ContactField) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: update(field),
    onBlur: blur(field),
    disabled: isPending,
    "aria-invalid": !!fieldError(field),
    "aria-describedby": fieldError(field) ? `${field}-error` : undefined,
    className: cn(inputBase, fieldError(field) ? "border-red-500/60" : "border-white/10"),
  });

  const label = (field: ContactField) => (
    <label htmlFor={field} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
      {t(`fields.${field}`)}
      <span className="text-cyan-500" aria-hidden>
        {" "}
        *
      </span>
    </label>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="relative space-y-6 rounded-4xl border border-white/5 bg-zinc-950/60 p-6 backdrop-blur-sm sm:p-8"
    >
      {/* Anti-spam: honeypot (hidden from people & assistive tech) + time-trap. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name="startedAt" value={startedAt || ""} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          {label("name")}
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.name.max}
            placeholder={t("placeholders.name")}
            required
          />
          {renderError("name")}
        </div>
        <div className="space-y-2">
          {label("email")}
          <input
            {...fieldProps("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email.max}
            placeholder={t("placeholders.email")}
            required
          />
          {renderError("email")}
        </div>
      </div>

      <div className="space-y-2">
        {label("subject")}
        <input
          {...fieldProps("subject")}
          type="text"
          maxLength={CONTACT_LIMITS.subject.max}
          placeholder={t("placeholders.subject")}
          required
        />
        {renderError("subject")}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          {label("message")}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              values.message.length > CONTACT_LIMITS.message.max ? "text-red-400" : "text-zinc-600",
            )}
            aria-live="polite"
          >
            {t("messageCounter", { count: values.message.length, max: CONTACT_LIMITS.message.max })}
          </span>
        </div>
        <textarea
          {...fieldProps("message")}
          rows={7}
          maxLength={CONTACT_LIMITS.message.max}
          placeholder={t("placeholders.message")}
          required
          className={cn(fieldProps("message").className, "min-h-40 resize-y")}
        />
        {renderError("message")}
      </div>

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-zinc-500">{t("responseTime")}</p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
```

## `components/direct-lumina-linker.tsx`

```tsx
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Download, Lock, Smartphone, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};
const detectMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

interface DirectLuminaLinkerProps {
  embedUrl: string;
  title?: string;
}

/**
 * Floating download button.
 *
 * BUG FIX (auth redirect state loss): signed-out users used to be pushed to
 * `/sign-in?fallback_redirect_url=<pathname>`, which lost `?s=&e=` and was
 * ignored by sign-up / OAuth. `requireAuth()` now captures the full current
 * URL and hands it to Clerk (plus a sessionStorage safety net).
 */
export default function DirectLuminaLinker({ embedUrl, title = "LuminaFlix" }: DirectLuminaLinkerProps) {
  const t = useTranslations("download");
  const { isSignedIn, requireAuth } = useAuthGate();

  const isMobile = useSyncExternalStore(subscribeNoop, detectMobile, () => false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  // Escape closes the QR dialog; listener only exists while it's open.
  useEffect(() => {
    if (!showQR) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQR(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showQR]);

  const handleClick = () => {
    if (!requireAuth()) return;

    if (isMobile) {
      const intentUrl =
        `intent:${embedUrl}#Intent;` +
        `action=android.intent.action.VIEW;` +
        `package=idm.internet.download.manager;` +
        `S.browser_fallback_url=${encodeURIComponent(embedUrl)};` +
        `S.title=${encodeURIComponent(title)};` +
        `end`;
      window.location.href = intentUrl;
    } else {
      // Read at click time so the QR code carries the current season/episode.
      setCurrentUrl(window.location.href);
      setShowQR(true);
    }
  };

  return (
    <>
      <div className="fixed right-4 bottom-4 z-100 sm:right-8 sm:bottom-8">
        <div className="group relative flex items-center justify-end">
          <div
            className={cn(
              "absolute right-0 flex items-center pr-14 transition-all duration-500",
              isMobile
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100",
            )}
          >
            <div className="mr-2 whitespace-nowrap rounded-md bg-white px-6 py-3 text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <div className="flex flex-col items-start leading-none">
                <span className="flex items-center gap-2 text-[11px] font-black uppercase italic tracking-tighter">
                  {isSignedIn ? (
                    <Download className="h-3 w-3 text-cyan-600" />
                  ) : (
                    <Lock className="h-3 w-3 text-cyan-600" />
                  )}
                  {isSignedIn ? t("download") : t("loginRequired")}
                </span>
                <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-600">
                  {isSignedIn ? t("directAccess") : t("authNeeded")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClick}
            aria-label={isSignedIn ? t("buttonLabel") : t("loginRequired")}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-black shadow-[0_0_40px_-10px_rgba(0,0,0,1)] transition-all duration-500 hover:border-cyan-500/50 focus-visible:border-cyan-500"
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 animate-pulse rounded-md group-hover:hidden",
                isSignedIn ? "bg-cyan-500/10" : "bg-white/5",
              )}
            />
            <Download className="h-6 w-6 text-white transition-colors group-hover:text-cyan-400" />
            <span
              aria-hidden
              className={cn(
                "absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black transition-colors",
                isSignedIn ? "bg-cyan-500" : "bg-zinc-600",
              )}
            />
          </button>
        </div>
      </div>

      {showQR && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lumina-qr-title"
          onClick={() => setShowQR(false)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl animate-in fade-in duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar relative max-h-full w-full max-w-100 overflow-y-auto rounded-[3rem] border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl sm:p-10"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-cyan-500 to-transparent" />

            <button
              type="button"
              onClick={() => setShowQR(false)}
              aria-label={t("close")}
              className="absolute top-8 right-8 cursor-pointer rounded-full bg-white/5 p-2 text-zinc-500 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1">
                  <Smartphone className="h-3 w-3 text-cyan-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">
                    {t("qrBadge")}
                  </span>
                </div>
                <h3
                  id="lumina-qr-title"
                  className="text-2xl font-black uppercase italic tracking-tighter text-white"
                >
                  {t("qrTitle")}
                </h3>
                <p className="px-4 text-xs leading-relaxed text-zinc-400">{t("qrBody")}</p>
              </div>

              <div className="relative mx-auto w-fit rounded-[2.5rem] bg-white p-6 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
                <QRCodeSVG
                  value={currentUrl}
                  size={220}
                  level="H"
                  marginSize={0}
                  imageSettings={{ src: "/favicon.ico", height: 48, width: 48, excavate: true }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## `components/episode-card.tsx`

```tsx
"use client";

import { Calendar, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { tmdbImage } from "@/lib/media";
import type { AnimeEpisode } from "@/typing";

const FALLBACK_STILL = "https://placehold.co/600x338/111/333?text=No+Preview";

function EpisodeCard({
  ep,
  seriesId,
  seasonNumber,
  path,
}: {
  ep: AnimeEpisode;
  seriesId: string;
  seasonNumber: number;
  path: "anime" | "k-drama";
}) {
  const t = useTranslations();

  // A11Y/UX: the whole card is now the link (previously only a hover-only
  // overlay was clickable, which was invisible on touch screens).
  return (
    <Link
      href={`/${path}/play/${seriesId}?s=${seasonNumber}&e=${ep.episode_number}`}
      aria-label={t("episodes.play", { number: ep.episode_number })}
      className="group relative block aspect-video overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 outline-none transition-colors hover:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <Image
        src={tmdbImage(ep.still_path) ?? FALLBACK_STILL}
        alt=""
        fill
        sizes="(min-width: 1280px) 290px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        className="object-cover opacity-60 transition-[opacity,transform] duration-700 group-hover:scale-110 group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />

      <div className="absolute bottom-4 left-4 right-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">
            {t("episodes.episodeShort", { number: ep.episode_number })}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <Calendar className="h-2.5 w-2.5" />
            {ep.air_date?.split("-")[0] || t("common.tba")}
          </span>
        </div>
        <h3 className="truncate text-sm font-bold uppercase tracking-tighter text-white">{ep.name}</h3>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-black shadow-[0_0_20px_#06b6d4]">
          <Play className="ml-1 h-5 w-5 fill-current" />
        </span>
      </div>
    </Link>
  );
}

export default memo(EpisodeCard);
```

## `components/episode-explorer.tsx`

```tsx
"use client";

import {
  AlertTriangle,
  ChevronDown,
  LayoutGrid,
  Loader2,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import { SectionHeader } from "@/components/layout/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";
import EpisodeCard from "./episode-card";

/** Episodes rendered per batch — long anime seasons can list 1,000+. */
const BATCH = 24;
const INLINE_SEASONS = 3;

interface Season {
  id: number;
  season_number: number;
}

/**
 * BUG FIXES / PERF:
 * - Rapid season clicks could resolve out of order and show the wrong season
 *   (no request tracking). Each request now has an id; stale ones are ignored.
 * - A failed request left the spinner forever (no try/finally).
 * - Seasons with hundreds of episodes rendered every card at once. Cards are
 *   now rendered in batches of 24 as the user scrolls (IntersectionObserver),
 *   keeping the DOM small.
 */
export default function EpisodeExplorer({
  seriesId,
  initialEpisodes,
  seasons,
  path,
}: {
  seriesId: string;
  initialEpisodes: AnimeEpisode[];
  seasons: Season[];
  path: "anime" | "k-drama";
}) {
  const t = useTranslations("episodes");
  const tc = useTranslations("common");
  const validSeasons = seasons.filter((season) => season.season_number > 0);
  const firstSeason = validSeasons[0]?.season_number ?? 1;

  const [activeSeason, setActiveSeason] = useState(firstSeason);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [visible, setVisible] = useState(BATCH);
  const requestId = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadSeason = async (season: number) => {
    const id = ++requestId.current;
    setActiveSeason(season);
    setStatus("loading");
    try {
      const data = await getSeasonEpisodes(seriesId, season);
      if (id !== requestId.current) return; // a newer request superseded this one
      setEpisodes(data);
      setVisible(BATCH);
      setStatus("idle");
    } catch {
      if (id === requestId.current) setStatus("error");
    }
  };

  const handleSeasonChange = (season: number) => {
    if (season !== activeSeason || status === "error") void loadSeason(season);
  };

  // Incremental rendering: reveal the next batch when the sentinel is near.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visible >= episodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting)
          setVisible((count) => Math.min(count + BATCH, episodes.length));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visible, episodes.length]);

  const inlineSeasons = validSeasons.slice(0, INLINE_SEASONS);
  const overflowSeasons = validSeasons.slice(INLINE_SEASONS);

  return (
    <section className="space-y-10" aria-labelledby="episodes-heading">
      <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-6 md:flex-row md:items-end">
        <div className="space-y-2">
          <SectionHeader id="episodes-heading" title={t("title")} />
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-cyan-500"
            />
            {t("seasonActive", {
              season: String(activeSeason).padStart(2, "0"),
            })}
          </p>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("title")}
        >
          {inlineSeasons.map((season) => (
            <button
              key={season.id}
              type="button"
              aria-pressed={activeSeason === season.season_number}
              aria-label={t("seasonLong", { season: season.season_number })}
              onClick={() => handleSeasonChange(season.season_number)}
              className={cn(
                "h-10 rounded-xl border px-5 text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                activeSeason === season.season_number
                  ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "border-white/5 bg-zinc-900/40 text-zinc-500 hover:border-white/20 hover:text-white",
              )}
            >
              {t("seasonShort", { season: season.season_number })}
            </button>
          ))}

          {overflowSeasons.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/40 px-4 text-[10px] font-black uppercase text-zinc-400 outline-none transition-colors hover:border-cyan-500/30 hover:text-white">
                <Plus className="h-3 w-3" />
                {t("moreSeasons")}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-64 min-w-30 rounded-2xl border-white/10 bg-[#050505] p-1 shadow-2xl backdrop-blur-3xl"
              >
                {overflowSeasons.map((season) => (
                  <DropdownMenuItem
                    key={season.id}
                    onSelect={() => handleSeasonChange(season.season_number)}
                    className={cn(
                      "mb-1 cursor-pointer rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest last:mb-0",
                      activeSeason === season.season_number
                        ? "bg-white text-black"
                        : "text-zinc-400 focus:bg-white focus:text-black",
                    )}
                  >
                    {t("seasonLong", { season: season.season_number })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
            <span className="sr-only">
              {t("seasonActive", { season: activeSeason })}
            </span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[3rem] border border-dashed border-red-500/20 py-24 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500/70" />
            <p className="text-sm font-bold text-zinc-400">{t("loadError")}</p>
            <button
              type="button"
              onClick={() => void loadSeason(activeSeason)}
              className="rounded-xl bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black hover:bg-cyan-500"
            >
              {tc("retry")}
            </button>
          </div>
        ) : episodes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 media-grid">
              {episodes.slice(0, visible).map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  ep={episode}
                  seriesId={seriesId}
                  seasonNumber={activeSeason}
                  path={path}
                />
              ))}
            </div>
            {visible < episodes.length && (
              <div
                ref={sentinelRef}
                className="flex flex-col items-center gap-3 pt-10"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {t("showing", { shown: visible, total: episodes.length })}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setVisible((count) =>
                      Math.min(count + BATCH, episodes.length),
                    )
                  }
                  className="rounded-xl border border-white/10 bg-zinc-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-colors hover:border-cyan-500/50 hover:text-white"
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-white/5 bg-zinc-900/5 py-32">
            <LayoutGrid className="mb-4 h-8 w-8 text-zinc-800" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
              {t("empty")}
            </h3>
            <p className="mt-2 text-[10px] font-bold uppercase text-zinc-700">
              {t("emptyBody", { season: activeSeason })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
```

## `components/favorite-card.tsx`

```tsx
"use client";

import { ArrowUpRight, BookmarkMinus, Calendar, MonitorPlay, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { memo, useTransition } from "react";
import { toast } from "sonner";
import type { FavoriteItem } from "@/action/get-favorites.action";
import { toggleFavorite } from "@/action/stream-actions";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const t = useTranslations("pages.favorites");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const poster = tmdbImage(item.poster_path);

  const href =
    item.savedType === "MOVIE"
      ? `/movies/${item.id}`
      : `/${item.savedType === "K_DRAMA" ? "k-drama" : "anime"}/play/${item.id}?s=${item.savedSeason}&e=${item.savedEpisode}`;

  const handleRemove = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite({
        mediaId: String(item.id),
        type: item.savedType,
        season: item.savedSeason,
        episode: item.savedEpisode,
      });
      if (result.success) {
        toast.success(t("removed"));
        router.refresh();
      } else {
        toast.error(t("removeError"));
      }
    });
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-6 overflow-hidden rounded-2xl border border-white/5 bg-white/2 p-4 outline-none transition-colors duration-500 hover:border-cyan-500/40 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-500",
        isPending && "pointer-events-none opacity-50 grayscale",
      )}
    >
      <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
        {poster && (
          <Image src={poster} alt="" fill sizes="96px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <span className="absolute bottom-1 right-1 rounded border border-white/5 bg-black/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-white/70 backdrop-blur-md">
          {item.savedType === "MOVIE" ? t("film") : t("series")}
        </span>
      </div>

      <div className="min-w-0 grow py-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="truncate pr-2 text-lg font-black uppercase italic leading-none tracking-tighter transition-colors group-hover:text-cyan-400">
            {item.title}
          </h3>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              aria-label={t("remove")}
              title={t("remove")}
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-zinc-500 transition-colors duration-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
            >
              <BookmarkMinus className={cn("h-4 w-4", isPending && "animate-pulse")} />
            </button>
            <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-cyan-400" />
          </div>
        </div>

        {item.episode_title && (
          <p className="mb-2 mt-1.5 truncate text-[10px] font-bold uppercase italic tracking-wider text-cyan-400/80">
            {item.episode_title}
          </p>
        )}

        <div className="mb-3 mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Star className="h-3 w-3 fill-cyan-500 text-cyan-500" />
            <span className="text-[11px] font-black tabular-nums">{item.vote_average.toFixed(1)}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.release_date?.split("-")[0] || "—"}</span>
          </span>
        </div>

        {item.savedType !== "MOVIE" && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-400">
            <MonitorPlay className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-tighter">
              S{item.savedSeason} <span className="mx-1 text-white/30">•</span> E{item.savedEpisode}
            </span>
          </span>
        )}

        {/* Locale-aware date via next-intl: no server/client hydration mismatch. */}
        <p className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-500/40" />
          {t("savedOn", { date: format.dateTime(new Date(item.created_date), { dateStyle: "medium" }) })}
        </p>
      </div>
    </Link>
  );
}

export default memo(FavoriteCard);
```

## `components/featured-banner.tsx`

```tsx
import { Play, Star } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { tmdbImage } from "@/lib/media";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Movie } from "@/typing";
import MovieDetails from "./movie-details";

export default async function FeaturedBanner({ movie }: { movie: Movie }) {
  const t = await getTranslations("home");
  const backdrop = tmdbImage(movie.backdrop_path);

  return (
    <section className="py-10 sm:py-14">
      <Container>
        <div className="group relative min-h-75 w-full overflow-hidden rounded-xl border border-white/10 md:min-h-100">
          {backdrop && (
            <Image
              src={backdrop}
              alt=""
              fill
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-transparent" />

          <div className="relative flex min-h-75 max-w-2xl flex-col justify-center space-y-4 p-6 sm:p-8 md:min-h-100 md:p-12">
            <div className="flex items-center gap-3">
              <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black">
                {t("featuredBadge")}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                {t("featuredRating", { rating: movie.vote_average.toFixed(1) })}
              </span>
            </div>

            <h2 className={cn(typo.h1)}>
              {movie.title}
              <span className="not-italic text-cyan-500">.</span>
            </h2>

            <p className="line-clamp-2 max-w-lg text-sm leading-relaxed text-zinc-300 md:text-base">
              {movie.overview}
            </p>

            <div className="pt-2">
              <MovieDetails movie={movie}>
                <button
                  type="button"
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase text-black shadow-lg transition-colors hover:bg-cyan-500 hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {t("viewDetails")}
                </button>
              </MovieDetails>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
```

## `components/footer.tsx`

```tsx
import { Facebook, Github, Instagram, Twitter, Youtube } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { Container } from "@/components/layout/container";
import { FOOTER_SECTIONS, SOCIAL_LINKS } from "@/lib/navigation";
import { Logo } from "./navbar";

const SOCIAL_ICONS = { facebook: Facebook, twitter: Twitter, instagram: Instagram, youtube: Youtube, github: Github };

export default async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();
  const socials = SOCIAL_LINKS.filter((social) => social.href);

  return (
    <footer className="mt-auto border-t border-white/5 bg-zinc-950 pb-12 pt-20 sm:pt-24">
      {/* UI STANDARD: footer shares the page container (was max-w-450 px-16). */}
      <Container>
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 space-y-6">
            <Logo size="sm" />
            <p className="max-w-sm text-sm font-medium leading-relaxed text-zinc-500">{t("tagline")}</p>
            <div className="flex flex-wrap items-center gap-4">
              <LanguageSwitcher align="start" />
              {socials.map(({ key, href }) => {
                const Icon = SOCIAL_ICONS[key];
                return (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(`social.${key}`)}
                    className="rounded-full border border-white/5 bg-zinc-900 p-2.5 text-zinc-500 transition-colors hover:border-cyan-500/30 hover:text-cyan-500"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <nav key={section.key} aria-labelledby={`footer-${section.key}`} className="space-y-6">
              <h2 id={`footer-${section.key}`} className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                {t(`sections.${section.key}`)}
              </h2>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.key}>
                    <Link
                      href={link.href}
                      className="text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
                    >
                      {t(`links.${link.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-10 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{t("copyright", { year })}</p>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {t("by")}
              <a
                href="https://tooj-rtn.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-500 hover:underline"
              >
                Tooj Rtn
              </a>
            </p>
          </div>

          <p className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/50 px-4 py-2">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">{t("status")}</span>
          </p>
        </div>

        <p className="mt-8 text-center text-[10px] text-zinc-700 md:text-left">{t("tmdb")}</p>
      </Container>
    </footer>
  );
}
```

## `components/genre-card.tsx`

```tsx
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { GenreWithStats } from "@/action/get-genres.action";
import { tmdbImage } from "@/lib/media";

export default async function GenreCard({ genre }: { genre: GenreWithStats }) {
  const t = await getTranslations("media");
  const poster = tmdbImage(genre.poster);

  return (
    <Link
      href={`/genres/${genre.id}`}
      className="group relative block h-28 overflow-hidden rounded-md border border-white/5 bg-zinc-900/40 transition-colors duration-500 hover:bg-cyan-600 focus-visible:outline-2 focus-visible:outline-cyan-500"
    >
      <div className="relative z-10 flex h-full flex-col justify-center p-5">
        <h3 className="line-clamp-1 text-xl font-black uppercase italic tracking-tight text-white transition-transform duration-300 group-hover:translate-x-1">
          {genre.name}
        </h3>
        <p className="mt-1 text-[11px] font-bold text-zinc-400 group-hover:text-white/90">
          {t("genreTitles", { count: genre.count })}
        </p>
      </div>

      {poster && (
        <div className="absolute -bottom-2 -right-2 h-28 w-20 transition-all duration-500 group-hover:-bottom-4 group-hover:right-2">
          <div className="relative h-full w-full rotate-12 shadow-2xl transition-transform duration-500 group-hover:rotate-0">
            <Image
              src={poster}
              alt=""
              fill
              sizes="80px"
              className="rounded-lg border border-white/10 object-cover opacity-50 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>
      )}
    </Link>
  );
}
```

## `components/guard-protocol.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCcw, ShieldAlert } from "lucide-react";

const IS_PROD = process.env.NODE_ENV === "production";
const OVERLAY_ID = "lumina-guard-overlay";
type BlockReason = "adblock" | "idm";

/**
 * Blocks the player when an ad blocker or a download-manager extension is
 * detected. Listeners are registered once and removed on unmount.
 */
export default function GuardProtocol({ children }: { children: React.ReactNode }) {
  const t = useTranslations("guard");
  const [reason, setReason] = useState<BlockReason | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onContextMenu = (e: MouseEvent) => {
      if (IS_PROD) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!IS_PROD) return;
      const key = e.key.toUpperCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (key === "I" || key === "J")) ||
        (e.ctrlKey && key === "U")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    (async () => {
      try {
        await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
      } catch {
        if (!cancelled) setReason("adblock");
        return;
      }
      const idmAttributes = ["__idm_id__", "idm_extension"];
      if (!cancelled && document.body.getAttributeNames().some((a) => idmAttributes.includes(a))) {
        setReason("idm");
      }
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Reload if the overlay is removed from the DOM by hand.
  useEffect(() => {
    if (!reason) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof HTMLElement && node.id === OVERLAY_ID) {
            window.location.reload();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [reason]);

  if (!reason) return <>{children}</>;

  return (
    <div
      id={OVERLAY_ID}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lumina-guard-title"
      className="fixed inset-0 z-999999 flex h-screen w-screen select-none flex-col items-center justify-center overflow-hidden bg-zinc-950 p-8 text-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12),transparent_60%)]" />

      <div className="relative z-10 max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-red-500/40 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>

        <div className="space-y-4">
          <h1
            id="lumina-guard-title"
            className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-4xl"
          >
            {t("title")}
          </h1>
          <span className="inline-block rounded-full border border-red-500/50 bg-red-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
            {t("code", { reason: t(reason) })}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-zinc-400">{t("body", { what: t(reason) })}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="group mx-auto flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-12 py-5 transition-all duration-500 hover:bg-cyan-500"
        >
          <RefreshCcw className="h-4 w-4 text-black transition-transform duration-700 group-hover:rotate-180" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-black">{t("reload")}</span>
        </button>
      </div>
    </div>
  );
}
```

## `components/hero-slider.tsx`

```tsx
"use client";

import { Info, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/container";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getDisplayTitle, getWatchHref, tmdbImage } from "@/lib/media";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Movie } from "@/typing";
import MovieDetails from "./movie-details";

const SLIDE_MS = 8000;
const MAX_SLIDES = 3;

export default function HeroSlider({ trendingMovies }: { trendingMovies: Movie[] }) {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = trendingMovies.slice(0, MAX_SLIDES);
  const count = slides.length;

  // PERF/UX: a timeout keyed on the active slide (instead of a free-running
  // interval) so a manual click restarts the countdown and the progress bar
  // stays in sync. Paused in background tabs and for reduced motion.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(() => setActiveIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, count, paused, reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("heroLabel")}
      className="relative h-[90vh] min-h-150 w-full overflow-hidden bg-black md:h-screen"
    >
      {slides.map((movie, index) => {
        const isActive = index === activeIndex;
        const title = getDisplayTitle(movie);
        const backdrop = tmdbImage(movie.backdrop_path);
        return (
          <div
            key={movie.id}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-all duration-1500 ease-in-out motion-reduce:transition-none",
              isActive ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-110 opacity-0",
            )}
          >
            <div className="absolute inset-0">
              {backdrop && (
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
            </div>

            {/* UI STANDARD: hero copy aligns with the shared container. */}
            <Container className="relative z-10 flex h-full flex-col justify-center">
              <div
                className={cn(
                  "max-w-2xl space-y-6 transition-all delay-300 duration-1000 motion-reduce:transition-none",
                  isActive ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0",
                )}
              >
                <p className="flex items-center gap-3">
                  <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black shadow-[0_0_15px_#06b6d4]">
                    {t("heroBadge")}
                  </span>
                </p>

                <h2 className={cn(typo.display, "line-clamp-2 drop-shadow-2xl")}>
                  {title}
                  <span className="not-italic text-cyan-500">.</span>
                </h2>

                <p className="line-clamp-3 max-w-xl text-base font-medium leading-relaxed text-white/70 md:text-lg">
                  {movie.overview}
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href={getWatchHref(movie.id, "movie")}
                    tabIndex={isActive ? 0 : -1}
                    className="group flex items-center gap-3 rounded-full bg-white px-8 py-3 text-xs font-black uppercase text-black transition-colors duration-500 hover:bg-cyan-500 hover:text-white md:px-10 md:py-4 md:text-sm"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {t("playNow")}
                  </Link>
                  <MovieDetails movie={movie}>
                    <button
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/10 px-8 py-3 text-xs font-black uppercase text-white backdrop-blur-xl transition-colors hover:bg-white/20 md:px-10 md:py-4 md:text-sm"
                    >
                      <Info className="h-5 w-5 text-cyan-400" />
                      {t("moreInfo")}
                    </button>
                  </MovieDetails>
                </div>
              </div>
            </Container>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4">
          {slides.map((movie, i) => {
            const isActive = activeIndex === i;
            return (
              <button
                key={movie.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={t("slide", { index: i + 1 })}
                aria-current={isActive}
                className="group relative flex cursor-pointer flex-col items-center p-2"
              >
                <span
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-md transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isActive ? "w-12 bg-white/20" : "w-6 bg-white/5 group-hover:bg-white/10",
                  )}
                >
                  {isActive && (
                    <span
                      key={`${activeIndex}-${paused}`}
                      className={cn(
                        "absolute inset-0 origin-left bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]",
                        !paused && !reducedMotion && "animate-[hero-progress_8s_linear_forwards]",
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_15px_#06b6d4]" />
    </section>
  );
}
```

## `components/home-cta.tsx`

```tsx
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";

export default async function HomeCTA() {
  const t = await getTranslations("home");

  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col items-center text-center">
        <div aria-hidden className="mb-8 h-1 w-24 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
        <h2 className={cn(typo.h1, "mb-6")}>{t("ctaTitle")}</h2>
        <p className={cn(typo.body, "mb-10 max-w-2xl sm:text-lg")}>{t("ctaBody")}</p>
        <Link
          href="/library"
          className="group flex items-center gap-3 rounded-full bg-cyan-500 px-12 py-4 text-sm font-black uppercase text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors duration-300 hover:bg-white"
        >
          {t("ctaButton")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </Container>
    </section>
  );
}
```

## `components/i18n/language-switcher.tsx`

```tsx
"use client";

import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { memo, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUserLocale } from "@/i18n/actions";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Replaces the old LanguageSelector, which rewrote `?display_lang=` into
 * every URL (and re-ran a history.replaceState effect on each navigation).
 * The choice is now a cookie; a router refresh re-renders server components
 * — UI strings *and* TMDB data — in the new language.
 */
function LanguageSwitcher({
  align = "end",
  className,
}: {
  align?: "start" | "end";
  className?: string;
}) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("change")}
        title={t("current", { language: localeMeta[locale].nativeName })}
        className={cn(
          "flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-white outline-none transition-colors hover:border-cyan-500/40 focus-visible:ring-2 focus-visible:ring-cyan-500/60",
          className,
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-cyan-400" />
        )}
        <span>{localeMeta[locale].short}</span>
        <ChevronDown className="h-3 w-3 text-zinc-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="z-100 min-w-40 rounded-2xl border-white/10 bg-[#050505] p-1 shadow-2xl backdrop-blur-3xl"
      >
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onSelect={() => change(code)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-300 outline-none focus:bg-white focus:text-black"
          >
            <span className="flex items-center gap-3">
              <span className="w-6 text-[10px] font-black text-cyan-500">{localeMeta[code].short}</span>
              {localeMeta[code].nativeName}
            </span>
            {code === locale && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(LanguageSwitcher);
```

## `components/layout/container.tsx`

```tsx
import { cn } from "@/lib/utils";

/**
 * UI STANDARD: the single horizontal constraint used by the navbar, every
 * page, the hero content and the footer. Change it here, nowhere else.
 */
export const CONTAINER_CLASS = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

type ContainerProps<T extends React.ElementType> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Container<T extends React.ElementType = "div">({
  as,
  className,
  children,
  ...props
}: ContainerProps<T>) {
  const Component = as ?? "div";
  return (
    <Component className={cn(CONTAINER_CLASS, className)} {...props}>
      {children}
    </Component>
  );
}
```

## `components/layout/empty-state.tsx`

```tsx
import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 px-6 py-24 text-center sm:py-32",
        className,
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-zinc-900 text-zinc-600">
          {icon}
        </div>
      )}
      <h2 className={type.h3}>{title}</h2>
      {description && <p className={cn(type.body, "max-w-md")}>{description}</p>}
      {action}
    </div>
  );
}
```

## `components/layout/media-grid.tsx`

```tsx
import { cn } from "@/lib/utils";

/**
 * Standard poster grid. `cv-auto` (content-visibility) lets the browser skip
 * layout/paint for off-screen cards, which keeps long grids cheap to scroll.
 */
export const MEDIA_GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function MediaGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(MEDIA_GRID_CLASS, "media-grid", className)}>{children}</div>;
}
```

## `components/layout/media-listing.tsx`

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/movies/pagination";
import type { MediaKind } from "@/lib/media";
import { inferMediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { EmptyState } from "./empty-state";
import { MediaGrid } from "./media-grid";

/** Posters in the first grid row are above the fold on most screens. */
const PRIORITY_COUNT = 6;

/**
 * Shared results block for every listing page: grid → empty state (with a
 * working reset link) → ad → server-rendered pagination.
 * PERF: the DOM is capped at one TMDB page (20 cards) per route and cards
 * use `content-visibility`, instead of an unbounded infinite list.
 */
export async function MediaListing({
  items,
  kind,
  page,
  totalPages,
  basePath,
  searchParams,
  emptyTitle,
  emptyDescription,
  resetHref,
  showAd = true,
}: {
  items: Movie[];
  /** Route kind for every card, or "auto" to infer per item (mixed results). */
  kind: MediaKind | "auto";
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  emptyTitle?: string;
  emptyDescription?: string;
  /** When set, the empty state offers a link back to the unfiltered list. */
  resetHref?: string;
  showAd?: boolean;
}) {
  const t = await getTranslations("filters");

  return (
    <>
      {items.length > 0 ? (
        <MediaGrid>
          {items.map((movie, index) => (
            <MovieCard
              key={`${movie.id}-${movie.media_type ?? ""}`}
              movie={movie}
              type={kind === "auto" ? inferMediaKind(movie) : kind}
              priority={page === 1 && index < PRIORITY_COUNT}
            />
          ))}
        </MediaGrid>
      ) : (
        <EmptyState
          title={emptyTitle ?? t("empty")}
          description={emptyDescription ?? (resetHref ? t("emptyBody") : undefined)}
          action={
            resetHref ? (
              <Link
                href={resetHref}
                className="text-xs font-black uppercase italic tracking-widest text-cyan-500 hover:underline"
              >
                {t("reset")}
              </Link>
            ) : undefined
          }
        />
      )}

      {showAd && (
        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>
      )}

      {items.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} searchParams={searchParams} />
      )}
    </>
  );
}

/** Parses `?page=` safely (1…500). */
export function parsePage(value?: string) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1;
}

/** Vertical divider used between filter and sort controls. */
export function ControlDivider() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-white/10" />;
}

/** Adds the original title in parentheses (used on anime & K-drama grids). */
export function withOriginalTitle(item: Movie): Movie {
  const name = item.name || item.title || "";
  const original = item.original_name || item.original_title;
  return { ...item, title: original && original !== name ? `${name} (${original})` : name };
}
```

## `components/layout/page-header.tsx`

```tsx
import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

/** Page-level title block, shared by every listing and support page. */
export function PageHeader({
  eyebrow,
  title,
  accent,
  meta,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Muted second half of the title (e.g. "Series <Vault>"). */
  accent?: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        {eyebrow && <p className={type.eyebrow}>{eyebrow}</p>}
        <h1 className={cn(type.h1, "wrap-break-word")}>
          {title}
          {accent && <span className="text-white/20"> {accent}</span>}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        {meta && (
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-cyan-500" />
            <p className={type.meta}>{meta}</p>
          </div>
        )}
        {description && <p className={cn(type.body, "max-w-2xl")}>{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-end">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Section title used inside pages (rows, blocks). */
export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
  id,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className={type.eyebrow}>{eyebrow}</p>}
        <h2 id={id} className={cn(type.h2, "truncate")}>
          {title}
          <span className="text-cyan-500 not-italic">.</span>
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
```

## `components/layout/page-shell.tsx`

```tsx
import { cn } from "@/lib/utils";
import { spacing } from "@/lib/typography";
import { Container } from "./container";

/**
 * Standard page wrapper: clears the fixed navbar, applies the shared
 * vertical rhythm and the container. Removes the per-page `pt-32 px-8
 * md:px-16` variations that caused layout shifts between routes.
 */
export function PageShell({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <main className={cn("min-h-screen bg-black text-white", spacing.pageTop, spacing.pageBottom, className)}>
      <Container className={cn(spacing.stack, containerClassName)}>{children}</Container>
    </main>
  );
}
```

## `components/layout/skeletons.tsx`

```tsx
import { cn } from "@/lib/utils";
import { MEDIA_GRID_CLASS } from "./media-grid";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-zinc-900/80", className)} />;
}

export function PosterSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={MEDIA_GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-12 w-72 max-w-full sm:h-14" />
      <Skeleton className="h-2.5 w-40" />
    </div>
  );
}
```

## `components/media/episode-play-view.tsx`

```tsx
import Link from "next/link";
import { ChevronLeft, Clapperboard, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SeriesDetails } from "@/action/get-kdrama-details.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import StreamPlayer from "@/components/player/stream-player";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";

const pad = (n: number) => String(n).padStart(2, "0");

/** Parses `?s=` / `?e=` (positive integers, defaults to 1). */
export function parseEpisodeParams(s?: string, e?: string) {
  const toInt = (v?: string) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 1;
  };
  return { season: toInt(s) || 1, episode: toInt(e) || 1 };
}

/** Shared anime / series watch page. */
export default async function EpisodePlayView({
  series,
  episodes,
  season,
  episode,
  path,
}: {
  series: SeriesDetails | null;
  episodes: AnimeEpisode[];
  season: number;
  episode: number;
  path: "anime" | "k-drama";
}) {
  const t = await getTranslations("details");

  if (!series) {
    return (
      <PageShell>
        <EmptyState title={t("notFound")} />
      </PageShell>
    );
  }

  const current = episodes.find((ep) => ep.episode_number === episode);
  const episodeTitle = current?.name || t("episodeFallback", { number: episode });

  return (
    <PageShell>
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0 space-y-6">
          <Link
            href={`/${path}/${series.id}`}
            className="group inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-white"
          >
            <span className="rounded-full bg-zinc-900 p-2 transition-colors group-hover:bg-cyan-500 group-hover:text-black">
              <ChevronLeft className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t("backToSeries")}</span>
          </Link>

          <div className="space-y-3">
            <p className={type.eyebrow}>{t("nowStreaming")}</p>
            <h1 className={cn(type.h1, "wrap-break-word")}>
              {series.name}
              <span className="text-cyan-500 not-italic">.</span>
            </h1>
            <p className="flex items-center gap-3 pt-1">
              <Clapperboard className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
              <span className="text-lg font-bold uppercase italic tracking-tight text-zinc-400 md:text-xl">
                {episodeTitle}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-2 md:self-end">
          <div className="flex flex-col">
            <span className="text-xs font-black leading-none text-white">S{pad(season)}</span>
            <span className="text-[8px] font-bold uppercase text-zinc-500">{t("season")}</span>
          </div>
          <span aria-hidden className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-xs font-black leading-none text-cyan-500">E{pad(episode)}</span>
            <span className="text-[8px] font-bold uppercase text-zinc-500">{t("episode")}</span>
          </div>
        </div>
      </header>

      <StreamPlayer
        kind={path === "anime" ? "anime" : "drama"}
        mediaId={String(series.id)}
        season={season}
        episode={episode}
        posterPath={series.poster_path}
        backdropPath={current?.still_path || series.backdrop_path}
        title={series.name}
      />

      <section className="flex items-start gap-6 rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-6 backdrop-blur-sm sm:p-8">
        <div className="hidden rounded-2xl bg-cyan-500 p-4 shadow-[0_0_20px_rgba(6,182,212,0.4)] sm:block">
          <Info className="h-6 w-6 text-black" />
        </div>
        <div className="space-y-2">
          <h2 className={type.h3}>{t("streamInfoTitle")}</h2>
          <p className={type.body}>{t("streamInfoBody", { title: series.name, episode: episodeTitle })}</p>
          <p className={type.meta}>{t("subtitlesNote")}</p>
        </div>
      </section>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
```

## `components/media/media-details-provider.tsx`

```tsx
"use client";

import { Calendar, Film, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDisplayTitle,
  getReleaseYear,
  getTrailerHref,
  getWatchHref,
  tmdbImage,
  type MediaKind,
} from "@/lib/media";
import type { Movie } from "@/typing";

type OpenDetails = (movie: Movie, kind: MediaKind) => void;

const MediaDetailsContext = createContext<OpenDetails | null>(null);

/**
 * PERF: every card used to mount its own Radix <Dialog>. A 20-card grid meant
 * 20 dialog roots and triggers; a home page with four rows meant ~60. There is
 * now exactly one dialog, opened through context.
 */
export function MediaDetailsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ movie: Movie; kind: MediaKind } | null>(null);
  const [open, setOpen] = useState(false);

  const openDetails = useCallback<OpenDetails>((movie, kind) => {
    setState({ movie, kind });
    setOpen(true);
  }, []);

  return (
    <MediaDetailsContext.Provider value={openDetails}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        {state && <DetailsContent movie={state.movie} kind={state.kind} onNavigate={() => setOpen(false)} />}
      </Dialog>
    </MediaDetailsContext.Provider>
  );
}

export function useMediaDetails(): OpenDetails {
  const context = useContext(MediaDetailsContext);
  if (!context) throw new Error("useMediaDetails must be used inside <MediaDetailsProvider>");
  return context;
}

function DetailsContent({
  movie,
  kind,
  onNavigate,
}: {
  movie: Movie;
  kind: MediaKind;
  onNavigate: () => void;
}) {
  const t = useTranslations("media");
  const title = getDisplayTitle(movie);
  const year = getReleaseYear(movie);
  const poster = tmdbImage(movie.poster_path);

  const { playHref, trailerHref } = useMemo(
    () => ({
      playHref: getWatchHref(movie.id, kind, title),
      trailerHref: getTrailerHref(movie.id, kind, title),
    }),
    [movie.id, kind, title],
  );

  const label = kind === "tv" ? t("series") : kind === "anime" ? t("anime") : t("movie");

  return (
    <DialogContent className="z-100 max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden rounded-[2rem] border-white/5 bg-zinc-950/95 p-0 text-white backdrop-blur-2xl no-scrollbar sm:max-w-175">
      <div className="relative grid min-h-137.5 grid-cols-1 gap-8 p-6 md:min-h-0 md:grid-cols-2">
        {/* Poster: background on mobile, column on desktop */}
        <div className="group absolute inset-0 aspect-2/3 overflow-hidden rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)] md:relative md:inset-auto">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              sizes="(min-width: 768px) 330px, 100vw"
              className="object-cover transition-transform duration-700 md:group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/90 to-black/20 md:hidden" />
          <div className="absolute inset-0 hidden items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 md:flex">
            <Link
              href={playHref}
              onClick={onNavigate}
              aria-label={t("play", { title })}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-transform active:scale-90"
            >
              <Play className="ml-1 h-8 w-8 fill-current text-black" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-end py-4 md:justify-between">
          <div>
            <DialogHeader className="text-left">
              <p className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 md:text-zinc-500">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                {label}
              </p>
              <DialogTitle className="mb-4 line-clamp-3 text-4xl font-black uppercase italic leading-none tracking-tighter">
                {title}
                <span className="not-italic text-cyan-500">.</span>
              </DialogTitle>
            </DialogHeader>

            <div className="mb-6 flex items-center gap-4">
              <div className="flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/20 px-3 py-1 text-sm font-black text-cyan-400 backdrop-blur-md md:bg-cyan-400/10">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="sr-only">{t("rating")}: </span>
                {(movie.vote_average ?? 0).toFixed(1)}
              </div>
              {year && (
                <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-zinc-200 md:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {year}
                </div>
              )}
            </div>

            <DialogDescription className="mb-8 max-h-36 overflow-y-auto pr-2 text-sm italic leading-relaxed text-zinc-200 md:text-zinc-400">
              {movie.overview}
            </DialogDescription>
          </div>

          <div className="space-y-4">
            <Link
              href={trailerHref}
              onClick={onNavigate}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 py-4 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-zinc-800 md:bg-zinc-900"
            >
              <Film className="h-4 w-4 text-cyan-500" />
              {t("watchTrailer")}
            </Link>
            <Link
              href={playHref}
              onClick={onNavigate}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-transparent bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-xl transition-colors hover:border-white/20 hover:bg-cyan-500 hover:text-white"
            >
              <Play className="h-4 w-4 fill-current transition-transform group-hover:scale-110" />
              {kind === "movie" ? t("startWatching") : t("exploreEpisodes")}
            </Link>
          </div>
        </div>
      </div>
    </DialogContent>
  );
}
```

## `components/media/section-search-results.tsx`

```tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MediaListing, withOriginalTitle } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import type { TMDBResponse } from "@/typing";

/** Shared anime / K-drama search results page (was two duplicated files). */
export default async function SectionSearchResults({
  query,
  data,
  page,
  section,
}: {
  query: string;
  data: TMDBResponse;
  page: number;
  section: "anime" | "k-drama";
}) {
  const [t, tNav] = await Promise.all([getTranslations("search"), getTranslations("nav")]);
  const sectionLabel = section === "anime" ? tNav("anime") : tNav("kdrama");

  return (
    <PageShell>
      <div className="space-y-8">
        <Link
          href={`/${section}`}
          className="group inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-cyan-500"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {t("backTo", { section: sectionLabel })}
          </span>
        </Link>
        <PageHeader
          title={t("resultsFor")}
          accent={query}
          meta={t("matches", { count: data.total_results })}
        />
      </div>
      <MediaListing
        items={data.results.map(withOriginalTitle)}
        kind={section === "anime" ? "anime" : "tv"}
        page={page}
        totalPages={data.total_pages}
        basePath={`/${section}/search/${encodeURIComponent(query)}`}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query })}
      />
    </PageShell>
  );
}
```

## `components/media/series-details-view.tsx`

```tsx
import Image from "next/image";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { SeriesDetails } from "@/action/get-kdrama-details.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import EpisodeExplorer from "@/components/episode-explorer";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { tmdbImage } from "@/lib/media";
import { spacing, type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { AnimeEpisode } from "@/typing";

/** Shared anime / series details page (hero + season & episode explorer). */
export default async function SeriesDetailsView({
  series,
  initialEpisodes,
  path,
}: {
  series: SeriesDetails | null;
  initialEpisodes: AnimeEpisode[];
  path: "anime" | "k-drama";
}) {
  const t = await getTranslations("details");

  if (!series) {
    return (
      <PageShell>
        <EmptyState title={t("notFound")} />
      </PageShell>
    );
  }

  const backdrop = tmdbImage(series.backdrop_path || series.poster_path);
  const badge =
    path === "anime"
      ? t("animeBadge")
      : series.origin_country?.includes("KR")
        ? t("kdramaBadge")
        : t("seriesBadge");
  const showOriginal = series.original_name && series.original_name !== series.name;

  return (
    <main className={cn("min-h-screen bg-black text-white", spacing.pageBottom)}>
      <section className="relative flex h-[69vh] min-h-130 w-full items-end">
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <Container className="relative pb-10">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                {badge}
              </span>
              <span className="flex items-center gap-1 font-bold text-cyan-400">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                <span className="text-sm">{(series.vote_average ?? 0).toFixed(1)}</span>
              </span>
            </div>

            <h1 className={cn(type.display, "wrap-break-word")}>
              {series.name}
              <span className="text-cyan-500 not-italic">.</span>
            </h1>
            {showOriginal && (
              <p className="text-2xl font-black uppercase tracking-tighter text-zinc-600 md:text-3xl">
                {series.original_name}
              </p>
            )}
            {series.overview && (
              <p className={cn(type.body, "line-clamp-3 max-w-2xl italic")}>{series.overview}</p>
            )}
          </div>
        </Container>
      </section>

      <Container className={spacing.section}>
        <EpisodeExplorer
          seriesId={String(series.id)}
          initialEpisodes={initialEpisodes}
          seasons={series.seasons ?? []}
          path={path}
        />
      </Container>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </main>
  );
}
```

## `components/movie-card.tsx`

```tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { memo, useCallback } from "react";
import { getDisplayTitle, getReleaseYear, tmdbImage, type MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { useMediaDetails } from "./media/media-details-provider";

/** Poster widths per breakpoint — must mirror MEDIA_GRID_CLASS / MovieRow. */
export const POSTER_SIZES =
  "(min-width: 1280px) 200px, (min-width: 1024px) 22vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

interface MovieCardProps {
  movie: Movie;
  type?: MediaKind;
  /** Eager-load and prioritise (first visible row only). */
  priority?: boolean;
  sizes?: string;
}

function MovieCard({ movie, type = "movie", priority = false, sizes = POSTER_SIZES }: MovieCardProps) {
  const t = useTranslations("media");
  const openDetails = useMediaDetails();
  const title = getDisplayTitle(movie);
  const year = getReleaseYear(movie);
  const poster = tmdbImage(movie.poster_path);

  const open = useCallback(() => openDetails(movie, type), [openDetails, movie, type]);
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    },
    [open],
  );

  const badge = type === "anime" ? t("anime") : type === "tv" ? t("series") : t("quality4k");

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("openDetails", { title })}
      onClick={open}
      onKeyDown={onKeyDown}
      className="group relative w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md border border-white/5 bg-zinc-900 shadow-lg">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-600">
            {title}
          </div>
        )}

        <span className="absolute right-2 top-2 rounded bg-cyan-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter text-black">
          {badge}
        </span>
        {movie.original_language && (
          <span className="absolute left-2 top-2 hidden rounded border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur-md group-hover:block">
            {movie.original_language}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 px-1">
        <h3 className="truncate text-xs font-bold uppercase tracking-tight text-white transition-colors group-hover:text-cyan-400">
          {title}
        </h3>
        <p className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
          {year && <span>{year}</span>}
          {year && movie.original_language && <span aria-hidden>•</span>}
          {movie.original_language && (
            <span className="font-bold uppercase text-cyan-500">{movie.original_language}</span>
          )}
          <span aria-hidden>•</span>
          <span className="text-white/60">{(movie.vote_average ?? 0).toFixed(1)}</span>
        </p>
      </div>
    </div>
  );
}

/** PERF: memoised — cards only re-render when their movie/type changes. */
export default memo(MovieCard);
```

## `components/movie-details.tsx`

```tsx
"use client";

import { Slot } from "@radix-ui/react-slot";
import type { MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { useMediaDetails } from "./media/media-details-provider";

/**
 * Wraps any clickable element (hero "More info", featured banner…) so it
 * opens the shared details dialog. API unchanged from the previous version.
 */
export default function MovieDetails({
  movie,
  children,
  type = "movie",
}: {
  movie: Movie;
  children: React.ReactElement;
  type?: MediaKind;
}) {
  const openDetails = useMediaDetails();
  return <Slot onClick={() => openDetails(movie, type)}>{children}</Slot>;
}
```

## `components/movie-row.tsx`

```tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { memo, useCallback, useRef } from "react";
import { SectionHeader } from "@/components/layout/page-header";
import { Container } from "@/components/layout/container";
import { inferMediaKind, type MediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import MovieCard from "./movie-card";

const ROW_POSTER_SIZES = "(min-width: 768px) 200px, 150px";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  /** Force a route kind; otherwise inferred per item (movie vs series). */
  type?: MediaKind;
  /** Prioritise the first posters (use for the first row below the hero). */
  priority?: boolean;
}

function MovieRow({ title, movies, type, priority = false }: MovieRowProps) {
  const t = useTranslations("common");
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: direction * row.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  if (movies.length === 0) return null;

  return (
    <section className="py-6 sm:py-8" aria-label={title}>
      <Container className="space-y-5">
        <SectionHeader
          title={title}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={t("scrollLeft")}
                className="rounded-full border border-white/5 bg-zinc-900 p-2 text-white transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={t("scrollRight")}
                className="rounded-full border border-white/5 bg-zinc-900 p-2 text-white transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />

        <div
          ref={rowRef}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 scrollbar-hide"
        >
          {movies.map((movie, index) => (
            <div key={movie.id} className="w-37.5 shrink-0 snap-start md:w-50">
              <MovieCard
                movie={movie}
                type={type ?? inferMediaKind(movie)}
                sizes={ROW_POSTER_SIZES}
                priority={priority && index < 6}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export default memo(MovieRow);
```

## `components/movies/advanced-filter.tsx`

```tsx
"use client";

import { ListFilter, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GENRE_OPTIONS, YEAR_OPTIONS, type MediaType } from "@/lib/filters";
import { cn } from "@/lib/utils";

const chip = (active: boolean) =>
  cn(
    "rounded-xl border px-4 py-2 text-[11px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500",
    active
      ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      : "border-white/5 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white",
  );

/**
 * BUG FIXES:
 * - Applying/resetting always navigated to `/movies`, so filtering on TV
 *   Shows, Library or New & Popular jumped to another page. Uses the current
 *   pathname now.
 * - TV and movie genre IDs differ (e.g. TV has no 28 "Action"): the list is
 *   chosen per media type.
 * - "Older" was sent raw to TMDB; it's now translated to a date filter
 *   server-side (see lib/tmdb.ts#yearParams).
 * - Draft selection re-syncs with the URL every time the dialog opens.
 */
export default function AdvancedFilter({
  mediaType = "movie",
  showYear = true,
}: {
  mediaType?: MediaType;
  showYear?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setGenre(searchParams.get("genre") ?? "all");
      setYear((searchParams.get("year") ?? "all").toLowerCase());
    }
    setOpen(next);
  };

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of [["genre", genre], ["year", year]] as const) {
      if (value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["genre", "year", "page"].forEach((key) => params.delete(key));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  const activeCount = ["genre", "year"].filter((key) => {
    const value = searchParams.get(key);
    return value && value.toLowerCase() !== "all";
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 shadow-xl outline-none transition-colors hover:border-cyan-500/50 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <ListFilter className="h-4 w-4 text-cyan-500" />
          {t("filters.button")}
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-black text-black">
              {activeCount}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="z-100 rounded-md border-white/10 bg-zinc-950/95 p-8 shadow-2xl ring-1 ring-white/5 backdrop-blur-2xl sm:max-w-md">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
            {t("filters.title")}
            <span className="text-cyan-500">.</span>
          </DialogTitle>
          <DialogDescription className="sr-only">{t("filters.emptyBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <fieldset>
            <legend className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              {t("filters.genres")}
            </legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={genre === "all"} onClick={() => setGenre("all")} className={chip(genre === "all")}>
                {t("filters.allGenres")}
              </button>
              {GENRE_OPTIONS[mediaType].map((id) => (
                <button key={id} type="button" aria-pressed={genre === id} onClick={() => setGenre(id)} className={chip(genre === id)}>
                  {t(`genres.g${id}` as "genres.g28")}
                </button>
              ))}
            </div>
          </fieldset>

          {showYear && (
            <fieldset>
              <legend className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                {t("filters.year")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {["all", ...YEAR_OPTIONS, "older"].map((value) => (
                  <button key={value} type="button" aria-pressed={year === value} onClick={() => setYear(value)} className={chip(year === value)}>
                    {value === "all" ? t("filters.allYears") : value === "older" ? t("filters.older") : value}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-10 flex gap-3">
          <button
            type="button"
            onClick={reset}
            aria-label={t("filters.reset")}
            title={t("filters.reset")}
            className="rounded-2xl border border-white/5 bg-zinc-900 p-4 text-zinc-500 transition-colors hover:text-white active:scale-90"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-2xl bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-colors hover:bg-cyan-500 hover:text-white active:scale-95"
          >
            {t("filters.apply")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## `components/movies/pagination.tsx`

```tsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** TMDB never serves beyond page 500. */
const MAX_PAGES = 500;
const WINDOW = 5;

/**
 * Server component: builds links from the page's own search params, so it no
 * longer needs useSearchParams (and the client bundle / Suspense it implied).
 */
export default async function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const t = await getTranslations("pagination");
  const lastPage = Math.min(totalPages, MAX_PAGES);
  if (lastPage <= 1) return null;

  const start = Math.max(1, Math.min(currentPage - 2, lastPage - WINDOW + 1));
  const pages = Array.from({ length: Math.min(WINDOW, lastPage) }, (_, i) => start + i);

  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const arrow =
    "rounded-xl border border-white/5 bg-zinc-900 p-2 transition-colors duration-300 hover:border-cyan-500/50 hover:bg-cyan-500 hover:text-black sm:p-3";

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/5 pt-10 sm:gap-2">
      {currentPage > 1 && (
        <Link href={href(currentPage - 1)} aria-label={t("previous")} className={arrow}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={href(page)}
          aria-label={t("page", { page })}
          aria-current={page === currentPage ? "page" : undefined}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-colors duration-300 sm:h-12 sm:w-12 sm:text-base",
            page === currentPage
              ? "bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.3)]"
              : "border border-white/5 bg-zinc-900 text-zinc-500 hover:text-white",
          )}
        >
          {page}
        </Link>
      ))}

      {currentPage < lastPage && (
        <Link href={href(currentPage + 1)} aria-label={t("next")} className={arrow}>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </nav>
  );
}
```

## `components/movies/sort-dropdown.tsx`

```tsx
"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORT_OPTIONS, resolveSort, type MediaType } from "@/lib/filters";
import { cn } from "@/lib/utils";

/**
 * BUG FIXES: always pushed to `/movies` (wrong on TV Shows / Library) and
 * offered movie-only sort keys on TV pages. Also migrated from a hand-rolled
 * overlay to Radix for keyboard support and focus management.
 */
export default function SortDropdown({
  mediaType = "movie",
  defaultSort,
}: {
  mediaType?: MediaType;
  defaultSort?: string;
}) {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = resolveSort(searchParams.get("sort") ?? undefined, mediaType, defaultSort);
  const currentOption = SORT_OPTIONS[mediaType].find((option) => option.value === current);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("sortLabel")}
        className="group flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-5 py-2.5 text-zinc-300 outline-none transition-colors hover:border-cyan-500/50 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <span className="text-sm font-bold uppercase tracking-widest">
          {currentOption ? t(`sort.${currentOption.key}`) : t("sortLabel")}
        </span>
        <ArrowUpDown className="h-4 w-4 text-cyan-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-100 w-56 rounded-xl border-white/10 bg-zinc-900 p-1 shadow-2xl backdrop-blur-xl">
        <DropdownMenuLabel className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {t("sortLabel")}
        </DropdownMenuLabel>
        {SORT_OPTIONS[mediaType].map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => handleSort(option.value)}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm font-bold outline-none",
              current === option.value ? "bg-cyan-500/5 text-cyan-500" : "text-zinc-400 focus:bg-white/5 focus:text-white",
            )}
          >
            {t(`sort.${option.key}`)}
            {current === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## `components/navbar-actions.tsx`

```tsx
"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import SignInLink from "@/components/auth/sign-in-link";
import SearchHub from "./search-hub";
import UserTerminal from "./user-terminal";

/**
 * CLEANUP: the previous version registered its own Cmd/Ctrl+K listener that
 * focused an input which no longer existed, racing with SearchHub's listener.
 * SearchHub owns the shortcut now.
 */
export default function NavbarActions() {
  const t = useTranslations("auth");

  return (
    <div className="hidden items-center gap-4 lg:flex">
      <SearchHub />
      <div aria-hidden className="h-6 w-px bg-white/10" />
      <div className="flex items-center gap-2">
        <SignedOut>
          <SignInLink className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-400 transition-colors hover:text-white">
            {t("signIn")}
          </SignInLink>
          <SignInLink
            route="/sign-up"
            className="group flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <span className="whitespace-nowrap text-sm font-black uppercase italic tracking-tighter text-black">
              {t("join")}
            </span>
            <ArrowRight className="h-4 w-4 text-black" />
          </SignInLink>
        </SignedOut>
        <SignedIn>
          <UserTerminal />
        </SignedIn>
      </div>
    </div>
  );
}
```

## `components/navbar.tsx`

```tsx
"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Loader2, Menu, Search, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { memo, useCallback, useState } from "react";
import SignInLink from "@/components/auth/sign-in-link";
import LanguageSwitcher from "@/components/i18n/language-switcher";
import { Container } from "@/components/layout/container";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useScrolled } from "@/hooks/use-scrolled";
import { NAV_INLINE_COUNT, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import NavbarActions from "./navbar-actions";

const inlineItems = NAV_ITEMS.slice(0, NAV_INLINE_COUNT);
const overflowItems = NAV_ITEMS.slice(NAV_INLINE_COUNT);

export const Logo = memo(function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const t = useTranslations("common");
  return (
    <Link href="/" className="group flex items-center gap-2" aria-label={`${t("brandFirst")}${t("brandSecond")} — ${t("home")}`}>
      <span
        className={cn(
          "flex rotate-3 items-center justify-center rounded-xl bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:rotate-0",
          size === "md" ? "h-10 w-10" : "h-8 w-8 rounded-lg",
        )}
      >
        <span className={cn("font-black italic leading-none text-black", size === "md" ? "text-xl" : "text-base")}>L</span>
      </span>
      <span className="text-2xl font-black uppercase italic tracking-tighter text-white">
        {t("brandFirst")}
        <span className="text-cyan-500">{t("brandSecond")}</span>
      </span>
    </Link>
  );
});

export default function Navbar() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const isScrolled = useScrolled(20);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Keep the item highlighted on nested pages (e.g. /movies/123).
  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );
  const isMoreActive = overflowItems.some((item) => isActive(item.href));

  const handleMobileSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    router.push(`/search/${encodeURIComponent(query)}`);
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery("");
  };

  return (
    <nav
      aria-label={t("nav.mainNavigation")}
      className={cn(
        "fixed top-0 z-100 w-full transition-[padding,background-color,border-color] duration-500",
        isScrolled ? "border-b border-white/5 bg-black/80 py-4 backdrop-blur-xl" : "bg-transparent py-6",
      )}
    >
      {/* UI STANDARD: same container as every page and the footer. */}
      <Container className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo />

          <div className="hidden items-center gap-8 xl:flex">
            {inlineItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-colors hover:text-cyan-500",
                  isActive(item.href) ? "text-cyan-500" : "text-zinc-500",
                )}
              >
                {t(`nav.${item.key}`)}
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "group flex cursor-pointer items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] outline-none transition-colors hover:text-cyan-500 focus-visible:text-cyan-500",
                  isMoreActive ? "text-cyan-500" : "text-zinc-500",
                )}
              >
                {t("nav.more")}
                <ChevronDown className="h-3 w-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-100 min-w-45 rounded-md border border-white/10 bg-zinc-950/95 p-2 backdrop-blur-2xl">
                {overflowItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <DropdownMenuItem key={item.key} asChild>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-md px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors focus:bg-cyan-500 focus:text-black",
                          active ? "bg-white/5 text-cyan-500" : "text-zinc-400",
                        )}
                      >
                        {t(`nav.${item.key}`)}
                        {active && <Zap className="h-3 w-3 fill-current" />}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <NavbarActions />
          <div className="hidden xl:block">
            <LanguageSwitcher />
          </div>

          <div className="flex items-center lg:hidden">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.openMenu")}
                className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-white transition-colors hover:bg-zinc-800 xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              showCloseButton={false}
              className="z-100 flex w-full flex-col border-zinc-800 bg-black/95 p-0 backdrop-blur-2xl sm:w-100 sm:max-w-100"
            >
              <div className="flex w-full shrink-0 items-center justify-between p-6">
                <SheetClose asChild>
                  <button
                    type="button"
                    aria-label={t("nav.closeMenu")}
                    className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
                <LanguageSwitcher />
              </div>

              <div className="flex flex-1 flex-col overflow-y-auto p-8 no-scrollbar">
                <form onSubmit={handleMobileSearch} role="search" className="group relative mb-12 shrink-0">
                  <div
                    aria-hidden
                    className={cn(
                      "absolute -inset-0.5 rounded-2xl bg-linear-to-r from-cyan-500 to-blue-600 blur transition duration-1000",
                      searchQuery ? "opacity-40" : "opacity-10",
                    )}
                  />
                  <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                    <Search className={cn("ml-4 h-5 w-5", searchQuery ? "text-cyan-400" : "text-zinc-500")} />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("search.mobilePlaceholder")}
                      aria-label={t("search.placeholder")}
                      className="w-full border-none bg-transparent px-4 py-5 text-sm font-bold uppercase tracking-widest text-white outline-none placeholder:text-zinc-700"
                    />
                    <button type="submit" aria-label={t("search.submit")} className="mr-2 rounded-xl bg-white p-3 text-black">
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </button>
                  </div>
                </form>

                <SheetTitle className="mb-12 text-3xl font-black uppercase italic tracking-tighter text-white">
                  {t("nav.menu")}
                  <span className="text-cyan-500">.</span>
                </SheetTitle>

                <div className="mb-12 flex flex-col gap-6">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SheetClose key={item.key} asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center justify-between font-black uppercase italic tracking-tighter transition-colors",
                            active ? "text-2xl text-white" : "text-zinc-500 hover:text-white",
                          )}
                        >
                          <span>{t(`nav.${item.key}`)}</span>
                          <Zap
                            className={cn(
                              "h-6 w-6 text-cyan-500",
                              active ? "scale-125 opacity-100" : "opacity-0 group-hover:opacity-100",
                            )}
                          />
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                <div className="mt-auto shrink-0 space-y-6 pb-12">
                  <div className="h-px w-full bg-white/5" />
                  <SignedOut>
                    <div className="flex flex-col gap-4">
                      <SignInLink
                        onNavigate={() => setIsOpen(false)}
                        className="w-full py-4 text-center text-xs font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white"
                      >
                        {t("auth.signIn")}
                      </SignInLink>
                      <SignInLink
                        route="/sign-up"
                        onNavigate={() => setIsOpen(false)}
                        className="w-full rounded-2xl bg-white py-5 text-center text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-500 hover:text-white"
                      >
                        {t("auth.joinNow")}
                      </SignInLink>
                    </div>
                  </SignedOut>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </nav>
  );
}
```

## `components/player/providers.ts`

```ts
import { Activity, FastForward, Globe2, Layers, Tv2, Zap, type LucideIcon } from "lucide-react";

/**
 * Stream sources, moved verbatim from the former VideoPlayer / AnimePlayer /
 * DramaPlayer components (no source added, removed or changed).
 */
export interface StreamTarget {
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
}

export interface Provider {
  id: string;
  name: string;
  icon: LucideIcon;
  url: (target: StreamTarget) => string;
}

export interface ProviderGroup {
  /** Tab key → translations under `player.tabs` / `player.languages`. */
  key: "fr" | "en" | "vo" | "vf" | "all";
  providers: Provider[];
}

export type PlayerKind = "movie" | "anime" | "drama";

const s = (t: StreamTarget) => t.season ?? 1;
const e = (t: StreamTarget) => t.episode ?? 1;

export const PLAYER_CONFIG: Record<PlayerKind, ProviderGroup[]> = {
  movie: [
    {
      key: "fr",
      providers: [
        { name: "Lumina frembed.surf TMBD", id: "frembed_surf_TMBD", icon: Tv2, url: (t) => `https://frembed.surf/embed/movie/${t.mediaId}` },
        { name: "Lumina frembed.surf IMDB", id: "frembed_surf_IMDB", icon: Tv2, url: (t) => `https://frembed.surf/embed/movie/${t.imdbId}` },
      ],
    },
    {
      key: "en",
      providers: [
        { name: "videasy (Flash)", id: "videasy", icon: FastForward, url: (t) => `https://player.videasy.ws/embed/movie/${t.mediaId}` },
        { name: "VidFast (Flash)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/movie/${t.mediaId}?autoPlay=true` },
        { name: "VidLink (Direct)", id: "vidlink", icon: Globe2, url: (t) => `https://vidlink.pro/movie/${t.mediaId}?primaryColor=06b6d4` },
        { name: "VidSrc (Global)", id: "vidsrc", icon: Zap, url: (t) => `https://vidsrc.sbs/embed/movie/${t.mediaId}` },
      ],
    },
  ],
  anime: [
    {
      key: "vo",
      providers: [
        { name: "VidFast (Speed)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Alternative)", id: "videasy", icon: Activity, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "vidnest.fun (Alt)", id: "vidnest", icon: Globe2, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "111movies.com", id: "111movies", icon: Layers, url: (t) => `https://111movies.com/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidLink.pro", id: "vidlink", icon: Zap, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "vidsrc.sbs", id: "vidsrc", icon: Globe2, url: (t) => `https://vidsrc.sbs/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
    {
      key: "vf",
      providers: [
        { name: "Lumina Best (FR)", id: "frembed", icon: Tv2, url: (t) => `https://frembed.surf/api/serie.php?id=${t.mediaId}&sa=${s(t)}&epi=${e(t)}` },
      ],
    },
  ],
  drama: [
    {
      key: "all",
      providers: [
        { name: "VidLink (Direct)", id: "vidlink", icon: Zap, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "VidSrc (Global)", id: "vidsrc", icon: Globe2, url: (t) => `https://vidsrc.sbs/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidFast (Flash)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Legacy)", id: "videasy", icon: Layers, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: Globe2, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
  ],
};

export const REACTION_TYPE: Record<PlayerKind, "MOVIE" | "ANIME" | "K_DRAMA"> = {
  movie: "MOVIE",
  anime: "ANIME",
  drama: "K_DRAMA",
};
```

## `components/player/stream-player.tsx`

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Activity, Cpu, Languages, Maximize, Minimize, Play } from "lucide-react";
import DirectLuminaLinker from "@/components/direct-lumina-linker";
import GuardProtocol from "@/components/guard-protocol";
import SignalMonitor from "@/components/signal-monitor";
import StreamActionSuite from "@/components/stream-action-suite";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import { PLAYER_CONFIG, REACTION_TYPE, type PlayerKind, type Provider, type ProviderGroup } from "./providers";

export interface StreamPlayerProps {
  kind: PlayerKind;
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  backdropPath?: string | null;
  posterPath?: string | null;
  title?: string;
}

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

function getOrientation(): LockableOrientation | undefined {
  return (typeof window !== "undefined" ? window.screen?.orientation : undefined) as
    | LockableOrientation
    | undefined;
}

/**
 * One player for movies, anime and K-dramas (replaces VideoPlayer,
 * AnimePlayer and DramaPlayer, which were ~95% duplicated). Sources come
 * from PLAYER_CONFIG and are unchanged.
 */
export default function StreamPlayer({
  kind,
  mediaId,
  imdbId,
  season,
  episode,
  backdropPath,
  posterPath,
  title,
}: StreamPlayerProps) {
  const t = useTranslations("player");
  const groups = PLAYER_CONFIG[kind];
  const isEpisode = kind !== "movie";

  const [groupKey, setGroupKey] = useState<ProviderGroup["key"]>(groups[0].key);
  const [sourceId, setSourceId] = useState<string>(groups[0].providers[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeGroup = groups.find((g) => g.key === groupKey) ?? groups[0];
  const activeSource: Provider =
    activeGroup.providers.find((p) => p.id === sourceId) ?? activeGroup.providers[0];

  const embedUrl = activeSource.url({ mediaId, imdbId, season, episode });
  const splash = tmdbImage(backdropPath || posterPath);

  // Custom fullscreen: lock scroll + orientation, Escape exits, always restore.
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const orientation = getOrientation();
    orientation?.lock?.("landscape").catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      try {
        orientation?.unlock?.();
      } catch {
        // Not supported outside fullscreen on some browsers.
      }
    };
  }, [isFullscreen]);

  const selectSource = useCallback((id: string) => {
    setSourceId(id);
    setIsFullscreen(false);
    setIsPlaying(false);
  }, []);

  const selectGroup = useCallback(
    (key: ProviderGroup["key"]) => {
      const group = groups.find((g) => g.key === key);
      if (!group) return;
      setGroupKey(key);
      selectSource(group.providers[0].id);
    },
    [groups, selectSource],
  );

  const languageLabel = t(`languages.${activeGroup.key}`);

  return (
    <GuardProtocol>
      <div className="w-full space-y-6 animate-in fade-in duration-700 sm:space-y-8">
        {groups.length > 1 && (
          <div className="flex items-center justify-between gap-6">
            <div
              role="tablist"
              aria-label={t("servers")}
              className="flex max-w-full items-center gap-1.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-1.5 backdrop-blur-md"
            >
              {groups.map((group, index) => {
                const selected = group.key === activeGroup.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectGroup(group.key)}
                    className={cn(
                      "cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:px-8 sm:text-[11px] sm:tracking-widest",
                      selected
                        ? index === 0
                          ? "bg-white text-black"
                          : "bg-cyan-500 text-black"
                        : "text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {group.key === "all" ? t("languages.all") : t(`tabs.${group.key}`)}
                  </button>
                );
              })}
            </div>
            <div className="hidden items-center rounded-2xl border border-white/5 bg-zinc-900/20 px-6 py-3 md:flex">
              <Activity className="h-4 w-4 animate-pulse text-cyan-500" />
            </div>
          </div>
        )}

        <SignalMonitor />

        <div className="flex flex-col items-end space-y-2">
          <div
            className={cn(
              "overflow-hidden border border-white/10 bg-black shadow-2xl ring-1 ring-white/5 transition-all duration-500",
              isFullscreen
                ? "fixed inset-0 z-9999 m-0 h-screen w-screen p-0 portrait:top-1/2 portrait:left-1/2 portrait:h-[100vw] portrait:w-[100vh] portrait:origin-center portrait:-translate-x-1/2 portrait:-translate-y-1/2 portrait:rotate-90"
                : "relative aspect-video max-h-[73vh] w-full md:max-h-[77vh]",
            )}
          >
            {isPlaying ? (
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={t("iframeTitle", { title: title || activeSource.name })}
                className="h-full w-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen"
                referrerPolicy="origin"
              />
            ) : (
              <div className="group relative flex h-full w-full items-center justify-center overflow-hidden">
                {splash ? (
                  <Image
                    src={splash}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-tr from-zinc-950 via-zinc-900 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/60" />

                <div className="relative z-10 flex flex-col items-center space-y-5 px-4 text-center sm:space-y-6">
                  {title && (
                    <h2 className="max-w-xl text-xl font-black tracking-tight text-white drop-shadow-md md:text-3xl">
                      {title}
                    </h2>
                  )}
                  {isEpisode && season != null && episode != null && (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                      {t("episodeTag", { season, episode })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="group/btn relative flex cursor-pointer items-center gap-4 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all duration-300 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] active:scale-95"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
                      <Play className="h-4 w-4 fill-black text-black transition-transform duration-300 group-hover/btn:scale-110" />
                    </span>
                    {isEpisode ? t("playEpisode") : t("play")}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="group absolute top-2 right-2 z-150 flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-cyan-500/50 hover:bg-zinc-900/80 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] active:scale-95 md:gap-0 md:bg-zinc-950/60 md:px-3 md:hover:gap-3 md:hover:pr-5"
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                {isFullscreen ? (
                  <Minimize className="h-5 w-5 text-zinc-400 transition-all duration-300 group-hover:text-white" />
                ) : (
                  <Maximize className="h-5 w-5 text-zinc-400 transition-all duration-300 group-hover:text-cyan-400 md:group-hover:rotate-90" />
                )}
              </span>
              <span className="max-w-50 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 transition-all duration-500 ease-in-out md:max-w-0 md:text-zinc-400 md:group-hover:max-w-37.5 md:group-hover:text-cyan-400">
                {isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              </span>
            </button>
          </div>

          <StreamActionSuite type={REACTION_TYPE[kind]} mediaId={mediaId} season={season} episode={episode} />
        </div>

        <div role="radiogroup" aria-label={t("servers")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeGroup.providers.map((provider) => {
            const Icon = provider.icon;
            const isActive = activeSource.id === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => selectSource(provider.id)}
                className={cn(
                  "relative flex cursor-pointer items-center gap-4 rounded-3xl border px-6 py-5 transition-all duration-500",
                  isActive ? "border-white bg-white" : "border-white/5 bg-zinc-900/40 hover:border-white/15",
                )}
              >
                <span className={cn("rounded-xl p-3", isActive ? "bg-black text-cyan-500" : "bg-white/5 text-zinc-500")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col items-start text-left">
                  <span
                    className={cn(
                      "text-[11px] font-black uppercase tracking-widest",
                      isActive ? "text-black" : "text-white",
                    )}
                  >
                    {provider.name}
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase", isActive ? "text-zinc-500" : "text-zinc-600")}>
                    {isActive ? t("active") : t("standby")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DirectLuminaLinker embedUrl={embedUrl} title={title || `Lumina_${kind}_${mediaId}`} />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-white/5 bg-zinc-950 px-6 py-5 shadow-2xl sm:px-8">
          <div className="flex items-center gap-3">
            <Cpu className="h-4 w-4 text-cyan-500/50" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
              {t("sourceId", { id: imdbId || mediaId })}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-2">
            <Languages className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
              {t("readyIn", { language: languageLabel })}
            </span>
          </div>
        </div>
      </div>
    </GuardProtocol>
  );
}
```

## `components/providers/toaster.tsx`

```tsx
"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-zinc-950 !border-white/10 !rounded-2xl",
          title: "!font-bold",
        },
      }}
    />
  );
}
```

## `components/search-hub.tsx`

```tsx
"use client";

import { ArrowRight, Film, Search, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SEARCH_GENRES } from "@/lib/filters";

export default function SearchHub() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // PERF: navigation used to be wrapped in an artificial 500 ms setTimeout,
  // which read as lag. We now navigate immediately and close the dialog.
  const navigate = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) navigate(`/search/${encodeURIComponent(value)}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-cyan-500/50 bg-zinc-900 px-4 py-3 transition-colors hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Search className="h-4 w-4 text-cyan-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t("search.trigger")}</span>
        <kbd className="hidden rounded border border-white/10 bg-black px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 xl:inline">
          {t("search.shortcut")}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="z-100 max-w-2xl overflow-hidden rounded-md border-white/10 bg-black/80 p-0 shadow-[0_0_100px_rgba(6,182,212,0.2)] outline-none backdrop-blur-3xl sm:max-w-2xl">
          <DialogTitle className="sr-only">{t("search.dialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("search.categories")}</DialogDescription>

          <form onSubmit={handleSearch} role="search" className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-8 top-1/2 h-6 w-6 -translate-y-1/2 text-zinc-700" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              className="w-full border-none bg-transparent py-11 pl-20 pr-14 text-2xl font-black uppercase italic tracking-tighter text-white outline-none placeholder:text-zinc-700 sm:text-3xl"
            />
            {query.trim().length > 0 && (
              <p className="pointer-events-none absolute left-20 right-8 top-[calc(50%+1.75rem)] flex items-center gap-2 text-cyan-500">
                <Zap className="h-3 w-3 fill-current" />
                <span className="truncate text-[10px] font-black uppercase tracking-widest">
                  {t("search.runSearch", { query: query.trim() })}
                </span>
              </p>
            )}
          </form>

          <div className="px-8 pb-8">
            <p className="mb-4 flex items-center gap-2">
              <Film className="h-3 w-3 text-cyan-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{t("search.categories")}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEARCH_GENRES.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(`/genres/${id}`)}
                  className="group/item relative flex overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 text-left transition-colors duration-300 hover:border-white hover:bg-white focus-visible:border-white focus-visible:bg-white"
                >
                  <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover/item:text-black group-focus-visible/item:text-black">
                    {t(`genres.g${id}` as "genres.g28")}
                  </span>
                  <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-black opacity-0 transition-opacity group-hover/item:opacity-100" />
                </button>
              ))}
              <Link
                href="/genres"
                onClick={() => setOpen(false)}
                className="group/item relative flex overflow-hidden rounded-xl border border-white/5 bg-white/5 p-3 transition-colors duration-300 hover:border-white hover:bg-white"
              >
                <span className="relative z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 transition-colors group-hover/item:text-black">
                  {t("search.seeAllGenres")}
                </span>
                <ArrowRight className="absolute bottom-1 right-1 h-3 w-3 text-black opacity-0 transition-opacity group-hover/item:opacity-100" />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-zinc-950/50 px-8 py-5 text-[9px] font-bold uppercase text-zinc-600">
            <kbd className="rounded border border-white/5 bg-zinc-900 px-1.5 py-0.5 text-zinc-500">ESC</kbd>
            <span>{t("search.escHint")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## `components/section-search.tsx`

```tsx
"use client";

import { Search, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Replaces the duplicated AnimeSearch / KDramaSearch components. */
export default function SectionSearch({
  basePath,
  placeholder,
  submitLabel,
}: {
  basePath: "/anime/search" | "/k-drama/search";
  placeholder: string;
  submitLabel: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = query.trim();
    if (value) router.push(`${basePath}/${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="group relative w-full max-w-sm">
      <div aria-hidden className="absolute -inset-1 rounded-2xl bg-cyan-500/20 opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100" />
      <div className="relative flex items-center rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-3 backdrop-blur-xl transition-colors group-focus-within:border-cyan-500/50">
        <Terminal className="mr-3 h-4 w-4 text-cyan-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full border-none bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none placeholder:text-zinc-600"
        />
        <button type="submit" aria-label={submitLabel} className="ml-2 transition-transform hover:scale-110">
          <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-cyan-500" />
        </button>
      </div>
    </form>
  );
}
```

## `components/signal-monitor.tsx`

```tsx
import { useTranslations } from "next-intl";

/** Playback tip shown above the player. Works in server and client trees. */
export default function SignalMonitor() {
  const t = useTranslations("player");

  return (
    <div
      role="note"
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/40 p-4 transition-colors duration-500 hover:border-amber-500/30"
    >
      <div className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-amber-500/5 blur-[50px] transition-colors group-hover:bg-amber-500/10" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/90">
            {t("advisoryTitle")}
          </h4>
          <p className="text-xs leading-relaxed text-zinc-400">{t("advisoryBody")}</p>
        </div>
      </div>
    </div>
  );
}
```

## `components/stream-action-suite.tsx`

```tsx
"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { useFormatter, useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { handleMediaReaction, toggleFavorite } from "@/action/stream-actions";
import { clientDb } from "@/lib/firebase";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { cn } from "@/lib/utils";

type ReactionType = "MOVIE" | "K_DRAMA" | "ANIME";
type ActionKind = "like" | "dislike" | "fav";

interface StreamActionSuiteProps {
  type: ReactionType;
  mediaId: string;
  season?: number;
  episode?: number;
}

interface FavoriteEntry {
  id?: string;
  type?: string;
  season?: number | null;
  episode?: number | null;
}

const btnBase =
  "group relative flex items-center justify-center overflow-hidden transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer";
const labelStyle = "text-[10px] font-black uppercase italic tracking-[0.2em] transition-all duration-500";

function StreamActionSuite({ type, mediaId, season, episode }: StreamActionSuiteProps) {
  const t = useTranslations("actions");
  const format = useFormatter();
  const { user } = useUser();
  const userId = user?.id;
  const { requireAuth } = useAuthGate();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [likeState, setLikeState] = useState<"liked" | "disliked" | null>(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);

  // Movies are stored per title; series per episode.
  const normalizedSeason = type === "MOVIE" ? null : (season ?? null);
  const normalizedEpisode = type === "MOVIE" ? null : (episode ?? null);

  useEffect(() => {
    const docId = type === "MOVIE" ? mediaId : `${mediaId}_S${season}_E${episode}`;

    const unsubReactions = onSnapshot(
      doc(clientDb, type, docId),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const likes: string[] = data.likes ?? [];
        const dislikes: string[] = data.dislikes ?? [];
        setCounts({ likes: likes.length, dislikes: dislikes.length });
        if (userId && likes.includes(userId)) setLikeState("liked");
        else if (userId && dislikes.includes(userId)) setLikeState("disliked");
        else setLikeState(null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    let unsubFavs = () => {};
    if (userId) {
      unsubFavs = onSnapshot(
        doc(clientDb, "FAVORITE", userId),
        (snapshot) => {
          const favs: FavoriteEntry[] = snapshot.data()?.favorites ?? [];
          setInWatchlist(
            favs.some(
              (f) =>
                f.id === mediaId &&
                f.type === type &&
                (f.season ?? null) === normalizedSeason &&
                (f.episode ?? null) === normalizedEpisode,
            ),
          );
        },
        () => setInWatchlist(false),
      );
    } else {
      setInWatchlist(false);
    }

    return () => {
      unsubReactions();
      unsubFavs();
    };
  }, [userId, type, mediaId, season, episode, normalizedSeason, normalizedEpisode]);

  const handleAction = (actionType: ActionKind) => {
    // BUG FIX: used to `alert()`; now opens sign-in and returns here afterwards.
    if (!requireAuth()) return;

    setActiveAction(actionType);
    startTransition(async () => {
      try {
        const result =
          actionType === "fav"
            ? await toggleFavorite({ mediaId, type, season, episode })
            : await handleMediaReaction({ mediaId, type, season, episode, action: actionType });
        if (!result.success) toast.error(t("error"));
      } catch {
        toast.error(t("error"));
      } finally {
        setActiveAction(null);
      }
    });
  };

  const compact = (n: number) => format.number(n, { notation: "compact", maximumFractionDigits: 1 });
  const disabled = isPending || isLoading;

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center justify-end gap-2 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleAction("fav")}
        aria-pressed={inWatchlist}
        className={cn(
          btnBase,
          "h-12 rounded-xl border px-6",
          inWatchlist
            ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white",
        )}
      >
        <span className="relative z-10 flex items-center gap-3">
          <span className="relative flex h-5 w-5 items-center justify-center">
            {activeAction === "fav" ? (
              <Loader2 className="h-5 w-5 animate-spin stroke-[3px]" />
            ) : inWatchlist ? (
              <BookmarkCheck className="h-5 w-5 stroke-[3px] animate-in zoom-in duration-300" />
            ) : (
              <Bookmark className="h-5 w-5 stroke-2 transition-transform duration-500 group-hover:rotate-12" />
            )}
          </span>
          <span className={labelStyle}>
            {activeAction === "fav" ? t("saving") : inWatchlist ? t("inFavorites") : t("addFavorite")}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAction("like")}
          aria-pressed={likeState === "liked"}
          aria-label={t("like")}
          title={t("like")}
          className={cn(
            btnBase,
            "h-10 gap-2 rounded-lg px-4",
            likeState === "liked" ? "text-cyan-400" : "text-zinc-500 hover:text-white",
          )}
        >
          {activeAction === "like" ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : (
            <ThumbsUp
              className={cn(
                "h-4 w-4 transition-all",
                likeState === "liked"
                  ? "scale-110 fill-cyan-400 drop-shadow-[0_0_10px_#06b6d4]"
                  : "group-hover:-translate-y-1",
              )}
            />
          )}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              isLoading && "h-3 w-6 animate-pulse rounded bg-white/10",
            )}
          >
            {!isLoading && compact(counts.likes)}
          </span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAction("dislike")}
          aria-pressed={likeState === "disliked"}
          aria-label={t("dislike")}
          title={t("dislike")}
          className={cn(
            btnBase,
            "h-10 gap-2 rounded-lg px-4",
            likeState === "disliked" ? "text-white" : "text-zinc-500 hover:text-white",
          )}
        >
          {activeAction === "dislike" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown
              className={cn(
                "h-4 w-4 transition-all",
                likeState === "disliked" ? "scale-110 fill-white" : "group-hover:translate-y-1",
              )}
            />
          )}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              isLoading && "h-3 w-6 animate-pulse rounded bg-white/10",
            )}
          >
            {!isLoading && compact(counts.dislikes)}
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(StreamActionSuite);
```

## `components/support/legal-page.tsx`

```tsx
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Bump when the legal text changes. */
const LAST_UPDATED = new Date("2026-09-25T00:00:00Z");

type Section = { title: string; body: string };

/**
 * Shared layout for /privacy and /terms. Content lives in the locale files
 * (`legal.<doc>.sections`) so both languages stay in sync.
 * NOTE: template text — have it reviewed by a lawyer before launch.
 */
export default async function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const [t, format] = await Promise.all([getTranslations("legal"), getFormatter()]);
  const sections = t.raw(`${doc}.sections`) as Section[];

  return (
    <PageShell containerClassName="max-w-3xl">
      <PageHeader
        title={t(`${doc}.title`)}
        accent={t(`${doc}.accent`)}
        meta={t("updated", { date: format.dateTime(LAST_UPDATED, { dateStyle: "long" }) })}
        description={t(`${doc}.intro`)}
      />

      <nav aria-label={t(`${doc}.title`)} className="rounded-3xl border border-white/5 bg-zinc-950 p-6">
        <ol className="grid gap-2 sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.title}>
              <a
                href={`#section-${index + 1}`}
                className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
              >
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28 space-y-3">
            <h2 className={type.h3}>
              <span className="text-cyan-500 not-italic">{index + 1}.</span> {section.title}
            </h2>
            <p className={type.prose}>{section.body}</p>
          </section>
        ))}
      </div>

      <p className={cn(type.body, "border-t border-white/5 pt-8")}>
        {t("contactPrompt")}{" "}
        <Link href="/contact" className="font-bold text-cyan-400 hover:underline">
          {t("contactCta")}
        </Link>
      </p>
    </PageShell>
  );
}
```

## `components/trailer-ad-engine.tsx`

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Play } from "lucide-react";

const AD_URL =
  "https://creamymouth.com/dYmCF.zCdOGIN/vUZTGiUn/Weomq9au/ZEU_l/kFPXToYe4tMiD/kf2FMzjKUttHN_jIgEwgOwTbYOypObQi";
const FLUID_JS = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
const FLUID_CSS = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css";
const AD_SECONDS = 15;
const WATCHDOG_SECONDS = 30;

interface FluidPlayerInstance {
  destroy: () => void;
}
type FluidPlayerFactory = (el: HTMLVideoElement, options: Record<string, unknown>) => FluidPlayerInstance;

declare global {
  interface Window {
    fluidPlayer?: FluidPlayerFactory;
  }
}

/**
 * Sponsor pre-roll before the YouTube trailer.
 * PERF/BUG FIX: the countdown and watchdog intervals used to be torn down and
 * re-created every second (state in the dependency array); they now run once
 * per phase and are always cleared on unmount.
 */
export default function TrailerAdEngine({ trailerKey, lang }: { trailerKey: string; lang: string }) {
  const t = useTranslations("trailer");
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adStarted, setAdStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AD_SECONDS);
  const [watchdogTime, setWatchdogTime] = useState(WATCHDOG_SECONDS);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<FluidPlayerInstance | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroyPlayer = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    try {
      playerRef.current?.destroy();
    } catch {
      // Fluid Player can throw if its DOM was already removed.
    }
    playerRef.current = null;
  }, []);

  useEffect(() => {
    if (!document.querySelector(`script[src="${FLUID_JS}"]`)) {
      const script = document.createElement("script");
      script.src = FLUID_JS;
      script.async = true;
      document.head.appendChild(script);

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = FLUID_CSS;
      document.head.appendChild(style);
    }
    return destroyPlayer;
  }, [destroyPlayer]);

  const finishAd = useCallback(() => {
    destroyPlayer();
    setIsAdPlaying(false);
    setIsUnlocked(true);
  }, [destroyPlayer]);

  // Detect real playback (some VAST tags never call adStartedCallback).
  useEffect(() => {
    const video = videoRef.current;
    if (!isAdPlaying || adStarted || !video) return;
    const onTime = () => {
      if (video.currentTime > 0 && !video.paused) setAdStarted(true);
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [isAdPlaying, adStarted]);

  // Skip countdown — one interval for the whole ad.
  useEffect(() => {
    if (!isAdPlaying || !adStarted) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (video && video.paused) return;
      setTimeLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isAdPlaying, adStarted]);

  // Watchdog — offers a bypass if the ad never starts.
  useEffect(() => {
    if (!isAdPlaying || adStarted) return;
    const id = setInterval(() => setWatchdogTime((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [isAdPlaying, adStarted]);

  const triggerAd = () => {
    setIsAdPlaying(true);
    setAdStarted(false);
    setTimeLeft(AD_SECONDS);
    setWatchdogTime(WATCHDOG_SECONDS);

    let attempts = 0;
    const init = () => {
      if (window.fluidPlayer && videoRef.current) {
        playerRef.current = window.fluidPlayer(videoRef.current, {
          layoutControls: {
            fillToContainer: true,
            primaryColor: "#06b6d4",
            autoPlay: true,
            playButtonShowing: false,
            mute: false,
          },
          vastOptions: {
            adList: [{ roll: "preRoll", vastTag: AD_URL }],
            adStartedCallback: () => setAdStarted(true),
            adFinishedCallback: finishAd,
            adErrorCallback: finishAd,
          },
        });
      } else if (attempts++ < 10) {
        retryTimer.current = setTimeout(init, 300);
      } else {
        finishAd();
      }
    };
    // Wait one frame so the <video> element is mounted.
    requestAnimationFrame(init);
  };

  if (isUnlocked) {
    return (
      <iframe
        title={t("playTrailer")}
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&hl=${lang}`}
        className="h-full w-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  const showBypass = watchdogTime === 0;
  const showSkip = adStarted && timeLeft === 0;

  return (
    <div className="relative h-full w-full bg-black">
      {isAdPlaying ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <video ref={videoRef} className="h-full w-full" playsInline />

          {!adStarted && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020202]/90 backdrop-blur-xl">
              <Loader2 className="mb-6 h-12 w-12 animate-spin text-cyan-500" />
              <div className="space-y-4 px-6 text-center" aria-live="polite">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">{t("loadingAd")}</p>
                {!showBypass && (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {t("timeout", { seconds: watchdogTime })}
                  </p>
                )}
                {showBypass && (
                  <button
                    type="button"
                    onClick={finishAd}
                    className="mx-auto flex cursor-pointer items-center gap-2 border border-red-500/40 bg-red-500/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all duration-300 hover:bg-red-500 hover:text-white"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {t("bypass")}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="absolute right-0 bottom-12 z-20">
            {adStarted && !showSkip && (
              <div className="flex items-center gap-4 border border-white/10 bg-black/90 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white backdrop-blur-md">
                <span className="h-1 w-1 animate-ping rounded-full bg-cyan-500" />
                {t("skipIn", { seconds: timeLeft })}
              </div>
            )}
            {showSkip && (
              <button
                type="button"
                onClick={finishAd}
                className="cursor-pointer bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-black shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-500"
              >
                {t("skipNow")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerAd}
          className="group absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-[#050505]"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_0_60px_rgba(6,182,212,0.3)] transition-all duration-700 group-hover:scale-110">
            <Play className="h-10 w-10 translate-x-1 fill-current text-black" />
          </span>
          <span className="mt-8 text-[11px] font-black uppercase italic tracking-[0.4em] text-white/70 transition-colors group-hover:text-cyan-400">
            {t("playTrailer")}
          </span>
        </button>
      )}
    </div>
  );
}
```

## `components/user-terminal.tsx`

```tsx
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

export default function UserTerminal() {
  const t = useTranslations("auth");
  const { user, isLoaded } = useUser();

  // Reserve the space while Clerk loads to avoid a navbar layout shift.
  if (!isLoaded || !user) return <div aria-hidden className="h-13.5 w-40" />;

  return (
    <div className="group relative flex items-center gap-3 rounded-md border border-white/5 bg-zinc-900/40 p-2 backdrop-blur-md transition-colors duration-500 hover:border-cyan-500/50">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2">
          <span className="max-w-28 truncate text-[10px] font-black uppercase italic leading-none tracking-tighter text-white">
            {user.firstName || user.username || t("account")}
          </span>
          <ShieldCheck className="h-3 w-3 text-cyan-500" />
        </div>
        <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors group-hover:text-cyan-400">
          {t("memberBadge")}
        </span>
      </div>

      <div className="relative">
        <div aria-hidden className="absolute -inset-1 rounded-full bg-linear-to-tr from-cyan-500 to-blue-600 opacity-20 blur-xs transition-opacity duration-500 group-hover:opacity-100" />
        <div className="relative flex items-center justify-center rounded-full bg-black">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9.5 h-9.5 rounded-full border border-white/10",
                userButtonPopoverCard: "bg-zinc-950 border border-white/10 backdrop-blur-xl",
                userButtonPopoverFooter: "hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
```

## `app/anime/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getAnimeDetails, getAnimeSeasonEpisodes } from "@/action/get-anime-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const anime = await getAnimeDetails(id);
  return anime ? { title: anime.name, description: anime.overview?.slice(0, 160) } : {};
}

export default async function AnimeDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  // PERF: details and first season load in parallel (were sequential).
  const [anime, initialEpisodes] = await Promise.all([getAnimeDetails(id), getAnimeSeasonEpisodes(id, 1)]);
  return <SeriesDetailsView series={anime} initialEpisodes={initialEpisodes} path="anime" />;
}
```

## `app/anime/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllAnime } from "@/action/get-all-anime.action";
import { MediaListing, parsePage, withOriginalTitle } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import SectionSearch from "@/components/section-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("anime") };
}

export default async function AnimePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parsePage(params.page);

  const [t, tSearch, data] = await Promise.all([
    getTranslations("pages.anime"),
    getTranslations("search"),
    getAllAnime(page),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <SectionSearch
            basePath="/anime/search"
            placeholder={tSearch("animePlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <MediaListing
        items={data.results.map(withOriginalTitle)}
        kind="anime"
        page={page}
        totalPages={data.total_pages}
        basePath="/anime"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
```

## `app/anime/play/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAnimeDetails, getAnimeSeasonEpisodes } from "@/action/get-anime-details.action";
import EpisodePlayView, { parseEpisodeParams } from "@/components/media/episode-play-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ s?: string; e?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [anime, t] = await Promise.all([getAnimeDetails(id), getTranslations("player")]);
  return anime ? { title: `${anime.name} · ${t("episodeTag", { season, episode })}` } : {};
}

export default async function AnimePlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [anime, episodes] = await Promise.all([getAnimeDetails(id), getAnimeSeasonEpisodes(id, season)]);

  return <EpisodePlayView series={anime} episodes={episodes} season={season} episode={episode} path="anime" />;
}
```

## `app/anime/search/[query]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSearchAnime } from "@/action/get-search-anime.action";
import { parsePage } from "@/components/layout/media-listing";
import SectionSearchResults from "@/components/media/section-search-results";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function AnimeSearchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decoded = safeDecode(query);
  const page = parsePage(sp.page);
  const data = await getSearchAnime(decoded, page);
  return <SectionSearchResults query={decoded} data={data} page={page} section="anime" />;
}
```

## `app/api/cron/sync/route.ts`

```ts
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { triggerDailySync } from "@/action/daily-sync.action";

/**
 * SECURITY FIX: the previous check compared `Bearer ${header}` with
 * `Bearer ${CRON_SECRET}`, which (a) passed when CRON_SECRET was unset and
 * the header was the literal string "undefined", and (b) was not
 * constant-time. Accepts both "Bearer <secret>" and a raw "<secret>".
 */
function isAuthorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    return NextResponse.json(await triggerDailySync());
  } catch (error) {
    console.error("[cron/sync] failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
```

## `app/api/webhooks/clerk/route.ts`

```ts
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/firebase-admin";
import admin from "firebase-admin";

export async function POST(req: Request) {
  // Use the secret from your Clerk Dashboard -> Webhooks -> Endpoint -> Signing Secret
  const WEBHOOK_SECRET =
    process.env.NODE_ENV === "development"
      ? process.env.CLERK_WEBHOOK_SECRET_DEV
      : process.env.CLERK_WEBHOOK_SECRET_PROD;

  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET_(DEV|PROD) is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers for Svix verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Verify against the raw body: re-serialising parsed JSON can change the
  // bytes (key order / whitespace) and break the signature check.
  const body = await req.text();

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Extract ID and Type
  const { id } = evt.data;
  const eventType = evt.type;

  // --- SYNC LOGIC ---

  if (eventType === "user.created" || eventType === "user.updated") {
    const { email_addresses, image_url, first_name, last_name } = evt.data;

    // Map Clerk data to Lumina Firebase Schema
    await db
      .collection("USERS")
      .doc(id!)
      .set(
        {
          clerkId: id,
          email: email_addresses[0]?.email_address,
          profileImage: image_url,
          firstName: first_name || "",
          lastName: last_name || "",
          fullName: `${first_name || ""} ${last_name || ""}`.trim(),
          lastActive: admin.firestore.FieldValue.serverTimestamp(),
          // BUG FIX: `createdAt: undefined` made Firestore reject every
          // user.updated event ("Cannot use undefined as a Firestore value").
          ...(eventType === "user.created" && {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        },
        { merge: true },
      );
  }

  if (eventType === "user.deleted") {
    await db.collection("USERS").doc(id!).delete();
  }

  return new Response("Lumina Sync Handshake Successful", { status: 200 });
}
```

## `app/contact/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Clock, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("contact") };
}

/** `?topic=premium` (from the Premium page) prefills the subject. */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const [{ topic }, t] = await Promise.all([searchParams, getTranslations("contact")]);
  const defaultSubject = topic === "premium" ? t("topics.premium") : "";

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <aside className="space-y-8 lg:col-span-5">
          <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />
          <ul className="space-y-4">
            <li className="flex items-start gap-4 rounded-3xl border border-white/5 bg-zinc-950 p-5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" aria-hidden />
              <p className={type.body}>{t("responseTime")}</p>
            </li>
            <li className="flex items-start gap-4 rounded-3xl border border-white/5 bg-zinc-950 p-5">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" aria-hidden />
              <p className={type.body}>
                {t("helpPrompt")}{" "}
                <Link href="/help" className="font-bold text-cyan-400 hover:underline">
                  {t("helpLink")}
                </Link>
              </p>
            </li>
          </ul>
        </aside>
        <div className="lg:col-span-7">
          <ContactForm defaultSubject={defaultSubject} />
        </div>
      </div>
    </PageShell>
  );
}
```

## `app/favorites/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getUserFavorites } from "@/action/get-favorites.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import FavoriteCard from "@/components/favorite-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("favorites"), robots: { index: false } };
}

export default async function FavoritesPage() {
  const [t, data] = await Promise.all([getTranslations("pages.favorites"), getUserFavorites()]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
      />

      {data.results.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.results.map((item) => (
            <FavoriteCard key={`${item.savedType}-${item.id}-${item.savedSeason}-${item.savedEpisode}`} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<PlusCircle className="h-8 w-8" />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link
              href="/movies"
              className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-xs font-black uppercase italic text-black transition-all duration-300 hover:bg-cyan-500 active:scale-95"
            >
              {t("emptyCta")}
            </Link>
          }
        />
      )}

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
```

## `app/genres/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getGenreName } from "@/action/get-all-genres.action";
import { getMoviesByGenre } from "@/action/get-movies-by-genre.action";
import { MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGenreName(id);
  return name ? { title: name } : {};
}

/**
 * PERF: used to call getAllGenres() — one discover request per genre (~20)
 * just to read this genre's name. Now a single cached /genre/movie/list.
 */
export default async function GenrePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const page = parsePage(sp.page);

  const [t, name, data] = await Promise.all([
    getTranslations("pages.genre"),
    getGenreName(id),
    getMoviesByGenre(id, page),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={name ?? t("unknown")}
        meta={t("count", { count: data.total_results })}
      />
      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath={`/genres/${id}`}
        searchParams={sp}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
```

## `app/genres/page.tsx`

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Hash } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllGenres } from "@/action/get-all-genres.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { tmdbImage } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("genres") };
}

export default async function AllGenresPage() {
  const [t, genres] = await Promise.all([getTranslations("pages.genres"), getAllGenres()]);

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} meta={t("total", { count: genres.length })} />

      <div className="media-grid grid grid-cols-1 border-t border-l border-white/5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {genres.map((genre, index) => {
          const backdrop = tmdbImage(genre.backdrop);
          return (
            <Link
              key={genre.id}
              href={`/genres/${genre.id}`}
              className="group relative flex aspect-video flex-col justify-between overflow-hidden border-r border-b border-white/5 bg-zinc-950 p-6 transition-all duration-700 sm:p-8 md:aspect-square"
            >
              {backdrop && (
                <div className="absolute inset-0">
                  <Image
                    src={backdrop}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-20 grayscale transition-all duration-1000 ease-out group-hover:scale-110 group-hover:opacity-40 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-black/60 transition-colors duration-700 group-hover:bg-black/20" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
                </div>
              )}

              <div className="relative flex items-start justify-between">
                <span className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-cyan-500 opacity-50" aria-hidden />
                  <span className="font-mono text-[10px] text-zinc-500 transition-colors group-hover:text-cyan-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition-all duration-500 group-hover:border-cyan-500 group-hover:bg-cyan-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-black" />
                </span>
              </div>

              <div className="relative">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 transition-colors group-hover:text-cyan-400">
                  {t("explore")}
                </span>
                <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter wrap-break-word transition-transform duration-500 group-hover:translate-x-2 sm:text-4xl">
                  {genre.name}
                </h2>
              </div>

              <span className="absolute bottom-0 left-0 h-1 w-full -translate-x-full bg-cyan-500 transition-transform duration-700 ease-in-out group-hover:translate-x-0" />
            </Link>
          );
        })}
      </div>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
```

## `app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* UI FIX: removed duplicate "@tailwind utilities" (already included by @import "tailwindcss")
   and the Arial override that was hiding the Geist font loaded in layout.tsx */
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif;
}

/* UI FIX: these classes were used in components but never defined */
@utility no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@utility scrollbar-hide {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  color-scheme: dark;
  --background: #020202;
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  html,
  body {
    overscroll-behavior-y: none;
    min-height: 100dvh;
    background-color: #020202;
  }

  body {
    @apply bg-background text-foreground;
    display: flex;
    flex-direction: column;
  }

  /* 1. Dimensions - Ultra thin for the "Pro" look */
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  /* 2. The Track - Deep recessed black */
  ::-webkit-scrollbar-track {
    background: #020202; /* Match your background exactly */
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 1); /* Creates a "recessed" trench effect */
  }

  /* 3. The Thumb - The "Dark-Cyan" Ghost */
  ::-webkit-scrollbar-thumb {
    /* Mix of Zinc-900 and Cyan-950 */
    background: linear-gradient(
      to bottom,
      rgba(8, 51, 68, 0.4),
      /* Deep Dark Cyan */ rgba(21, 94, 117, 0.4) /* Cyan-800 at 40% */
    );
    border-radius: 20px;
    /* This creates a 1px gap around the thumb so it doesn't touch the track edges */
    border: 1px solid transparent;
    background-clip: padding-box;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  /* 4. The Hover - Full Cyan Activation */
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      to bottom,
      #0891b2,
      /* Cyan-600 */ #06b6d4 /* Cyan-500 */
    );
    /* Neon glow effect */
    box-shadow:
      0 0 15px rgba(6, 182, 212, 0.4),
      inset 0 0 4px rgba(255, 255, 255, 0.2);
  }

  /* 5. Firefox Fallback (Matched to the dark theme) */
  * {
    @apply border-border outline-ring/50;
    scrollbar-width: thin;
    scrollbar-color: #155e75 #020202;
  }
}

/* Define the progress animation */
@keyframes hero-progress {
  0% {
    transform: scaleX(0);
  }
  100% {
    transform: scaleX(1);
  }
}

@theme {
  /* This registers the animation so you can use 'animate-hero-progress' */
  --animate-hero-progress: hero-progress linear forwards;
}

/* Optional: Smooth transition for the scaling effect */
.hero-slide-enter {
  animation: fadeInScale 1s ease-out forwards;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(1.1);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Fluid Player Customization */
.fluid_video_wrapper {
  background-color: black !important;
}
.fluid_controls_container {
  color: #06b6d4 !important; /* Cyan accents */
}

/* 404 page progress bar (moved from styled-jsx, whose scoped keyframe name
   could not be reached by the Tailwind animate-[loading_...] class) */
@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(200%);
  }
  100% {
    transform: translateX(-100%);
  }
}

/* PERF: off-screen poster cards skip layout & paint until they scroll into
   view (keeps 20–40 item grids cheap without a virtualization library). */
.media-grid > * {
  content-visibility: auto;
  contain-intrinsic-size: auto 360px;
}
```

## `app/help/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Monitor, Smartphone, Tv, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

type Category = { title: string; items: { q: string; a: string }[] };
type Device = { title: string; body: string };
const DEVICE_ICONS: LucideIcon[] = [Monitor, Smartphone, Tv];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("help") };
}

export default async function HelpPage() {
  const t = await getTranslations("help");
  const categories = t.raw("categories") as Category[];
  const devices = t.raw("devices") as Device[];

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />

      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="faq-title" title={t("faqTitle")} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.title} className="space-y-3">
              <h3 className={type.eyebrow}>{category.title}</h3>
              {category.items.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-white/5 bg-zinc-950 p-5 open:border-cyan-500/30">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-bold text-white">
                    {item.q}
                    <span aria-hidden className="text-cyan-500 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className={cn(type.prose, "mt-3")}>{item.a}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section id="devices" aria-labelledby="devices-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="devices-title" title={t("devicesTitle")} eyebrow={t("devicesBody")} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {devices.map((device, index) => {
            const Icon = DEVICE_ICONS[index] ?? Monitor;
            return (
              <article key={device.title} className="space-y-4 rounded-4xl border border-white/5 bg-zinc-950 p-8">
                <span className="inline-flex rounded-2xl bg-cyan-500/10 p-3 text-cyan-500">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className={type.h3}>{device.title}</h3>
                <p className={type.body}>{device.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col items-center gap-5 rounded-[2.5rem] border border-cyan-500/20 bg-cyan-500/5 px-6 py-12 text-center">
        <h2 className={type.h2}>{t("stillNeedHelp")}</h2>
        <p className={cn(type.body, "max-w-md")}>{t("stillNeedHelpBody")}</p>
        <Link
          href="/contact"
          className="rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-400"
        >
          {t("contactCta")}
        </Link>
      </section>
    </PageShell>
  );
}
```

## `app/k-drama/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const drama = await getKDramaDetails(id);
  return drama ? { title: drama.name, description: drama.overview?.slice(0, 160) } : {};
}

export default async function KDramaDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [drama, initialEpisodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, 1)]);
  return <SeriesDetailsView series={drama} initialEpisodes={initialEpisodes} path="k-drama" />;
}
```

## `app/k-drama/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllKDramas } from "@/action/get-all-kdramas.action";
import { MediaListing, parsePage, withOriginalTitle } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import SectionSearch from "@/components/section-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("kdrama") };
}

export default async function KDramaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parsePage(params.page);

  const [t, tSearch, data] = await Promise.all([
    getTranslations("pages.kdrama"),
    getTranslations("search"),
    getAllKDramas(page),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <SectionSearch
            basePath="/k-drama/search"
            placeholder={tSearch("kdramaPlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <MediaListing
        items={data.results.map(withOriginalTitle)}
        kind="tv"
        page={page}
        totalPages={data.total_pages}
        basePath="/k-drama"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
```

## `app/k-drama/play/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import EpisodePlayView, { parseEpisodeParams } from "@/components/media/episode-play-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ s?: string; e?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, t] = await Promise.all([getKDramaDetails(id), getTranslations("player")]);
  return drama ? { title: `${drama.name} · ${t("episodeTag", { season, episode })}` } : {};
}

export default async function KDramaPlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, episodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, season)]);

  return <EpisodePlayView series={drama} episodes={episodes} season={season} episode={episode} path="k-drama" />;
}
```

## `app/k-drama/search/[query]/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSearchKDramas } from "@/action/get-search-kdrama.action";
import { parsePage } from "@/components/layout/media-listing";
import SectionSearchResults from "@/components/media/section-search-results";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function KDramaSearchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decoded = safeDecode(query);
  const page = parsePage(sp.page);
  const data = await getSearchKDramas(decoded, page);
  return <SectionSearchResults query={decoded} data={data} page={page} section="k-drama" />;
}
```

## `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import NextTopLoader from "nextjs-toploader";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PostAuthRedirect from "@/components/auth/post-auth-redirect";
import { MediaDetailsProvider } from "@/components/media/media-details-provider";
import Toaster from "@/components/providers/toaster";
import { localeMeta, type Locale } from "@/i18n/config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  // A11Y: removed `maximumScale: 1`, which blocked pinch-zoom.
};

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("metadata");

  return {
    metadataBase: new URL(DOMAIN),
    title: { default: t("defaultTitle"), template: "%s | LuminaFlix" },
    description: t("description"),
    robots: { index: true, follow: true },
    keywords: ["streaming", "movies", "tv shows", "anime", "k-drama", "luminaflix"],
    authors: [{ name: "Tooj Rtn" }],
    creator: "Tooj Rtn",
    publisher: "LuminaFlix",
    openGraph: {
      type: "website",
      locale: localeMeta[locale].og,
      alternateLocale: Object.values(localeMeta)
        .map((m) => m.og)
        .filter((og) => og !== localeMeta[locale].og),
      url: DOMAIN,
      siteName: "LuminaFlix",
      title: "LuminaFlix",
      description: t("ogDescription"),
      images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: t("ogAlt") }],
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as Locale;

  return (
    <ClerkProvider
      localization={locale === "fr" ? frFR : undefined}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang={locale} className="dark">
        <body className={`${geistSans.variable} ${geistMono.variable} bg-black antialiased`}>
          <NextIntlClientProvider>
            <NextTopLoader
              color="#06b6d4"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #06b6d4, 0 0 5px #06b6d4"
            />
            <MediaDetailsProvider>
              <Navbar />
              {children}
              <Footer />
            </MediaDetailsProvider>
            <PostAuthRedirect />
            <Toaster />
            <Analytics />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

## `app/library/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, LayoutGrid, Star, TrendingUp, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getLibrary } from "@/action/get-library.action";
import { MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { SORT_OPTIONS, resolveSort } from "@/lib/filters";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const DEFAULT_SORT = "vote_average.desc";
type SearchParams = { page?: string; sort?: string; genre?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("library") };
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "movie", DEFAULT_SORT);
  const genre = params.genre ?? "all";

  const [t, tFilters, data] = await Promise.all([
    getTranslations("pages.library"),
    getTranslations("filters"),
    getLibrary(page, sort, genre),
  ]);

  const sortKey = SORT_OPTIONS.movie.find((option) => option.value === sort)?.key ?? "topRated";

  // BUG FIX: these tiles looked clickable but did nothing.
  const shortcuts: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: "/library?sort=vote_average.desc", label: t("shortcuts.topRated"), icon: Star, active: sort === "vote_average.desc" },
    { href: "/library?sort=popularity.desc", label: t("shortcuts.popular"), icon: TrendingUp, active: sort === "popularity.desc" },
    { href: "/favorites", label: t("shortcuts.favorites"), icon: Bookmark, active: false },
    { href: "/genres", label: t("shortcuts.genres"), icon: LayoutGrid, active: false },
  ];

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <header className="flex flex-col justify-between rounded-[2.5rem] border border-white/5 bg-linear-to-br from-zinc-900 to-black p-7 md:col-span-2 lg:p-10">
          <h1 className={type.h1}>
            {t("title")} <span className="text-cyan-500">{t("accent")}</span>
            <span className="text-cyan-500 not-italic">.</span>
          </h1>
          <p className={cn(type.meta, "mt-8 flex items-center gap-2")}>
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            {t("count", { count: data.total_results })}
          </p>
        </header>

        <nav className="grid grid-cols-2 gap-4">
          {shortcuts.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex flex-col items-center justify-center gap-3 rounded-4xl border p-6 text-center transition-all",
                active
                  ? "border-cyan-500/60 bg-cyan-500/10"
                  : "border-white/5 bg-zinc-900/50 hover:border-cyan-500/50",
              )}
            >
              <Icon className="h-6 w-6 text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
                {label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-full bg-cyan-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black">
            {t("allContent")}
          </span>
          <span className={type.meta}>{t("sortedBy", { sort: tFilters(`sort.${sortKey}`) })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdvancedFilter mediaType="movie" showYear={false} />
          <SortDropdown mediaType="movie" defaultSort={DEFAULT_SORT} />
        </div>
      </div>

      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/library"
        searchParams={params}
        resetHref="/library"
      />
    </PageShell>
  );
}
```

## `app/loading.tsx`

```tsx
import { PageShell } from "@/components/layout/page-shell";
import { GridSkeleton, HeaderSkeleton } from "@/components/layout/skeletons";

/** Route-level skeleton: same shell as every page, so nothing shifts on load. */
export default function Loading() {
  return (
    <PageShell>
      <HeaderSkeleton />
      <GridSkeleton count={18} />
    </PageShell>
  );
}
```

## `app/movies/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, Search, Sparkles } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { getFallbackMovie } from "@/action/get-fallback-movies.action";
import { getMovieData } from "@/action/get-movie-data.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageShell } from "@/components/layout/page-shell";
import StreamPlayer from "@/components/player/stream-player";
import { getReleaseYear, tmdbImage } from "@/lib/media";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ fallback?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMovieData(id);
  if (!movie) {
    const t = await getTranslations("media");
    return { title: t("notFoundTitle"), robots: { index: false } };
  }
  const image = tmdbImage(movie.backdrop_path || movie.poster_path);
  return {
    title: movie.title,
    description: movie.overview?.slice(0, 160),
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

export default async function WatchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { fallback }] = await Promise.all([params, searchParams]);
  const [movie, t, format] = await Promise.all([getMovieData(id), getTranslations("media"), getFormatter()]);

  if (!movie) {
    const alternatives = fallback ? (await getFallbackMovie(fallback)).slice(0, 6) : [];

    return (
      <PageShell containerClassName="max-w-4xl">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto w-fit">
            <div className="absolute -inset-4 animate-pulse rounded-full bg-red-500/20 blur-2xl" />
            <AlertCircle className="relative h-16 w-16 text-red-500" />
          </div>
          <h1 className={type.h1}>
            {t("notFoundTitle")}
            <span className="text-red-500 not-italic">.</span>
          </h1>
          <p className={cn(type.body, "mx-auto max-w-xl")}>{t("notFoundBody", { id })}</p>
        </div>

        <section className="space-y-8">
          {fallback && (
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-500" />
              <h2 className={cn(type.meta, "min-w-0 wrap-break-word")}>{t("similarTo", { query: fallback })}</h2>
            </div>
          )}

          {alternatives.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {alternatives.map((item) => {
                const image = tmdbImage(item.backdrop_path || item.poster_path);
                const title = item.title || item.name || "";
                return (
                  <Link
                    key={item.id}
                    href={`/movies/${item.id}?fallback=${encodeURIComponent(title.toLowerCase())}`}
                    className="group rounded-4xl border border-white/5 bg-zinc-900/40 p-4 transition-all hover:scale-[1.02] hover:bg-zinc-800/60"
                  >
                    <div className="relative mb-4 aspect-video overflow-hidden rounded-2xl bg-zinc-900">
                      {image && (
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
                          className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                    </div>
                    <h3 className="truncate text-left text-sm font-black uppercase italic tracking-tight">{title}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-cyan-500">{getReleaseYear(item) || "—"}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-600 transition-colors group-hover:text-white" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className={cn(type.meta, "py-16 text-center")}>{t("noSimilar")}</p>
          )}

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-500"
            >
              {t("backHome")}
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  const released = movie.release_date
    ? format.dateTime(new Date(movie.release_date), { dateStyle: "medium" })
    : null;

  return (
    <PageShell>
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            {t("quality4k")}
          </span>
          <span className={type.meta}>{t("nowPlaying")}</span>
        </div>
        <h1 className={cn(type.h1, "wrap-break-word")}>
          {movie.title}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
      </header>

      <StreamPlayer
        kind="movie"
        mediaId={String(movie.id)}
        imdbId={movie.external_ids?.imdb_id ?? undefined}
        posterPath={movie.poster_path}
        backdropPath={movie.backdrop_path}
        title={movie.title}
      />

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>

      <section className="grid grid-cols-1 gap-12 border-t border-white/5 pt-12 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className={cn(type.meta, "flex items-center gap-2")}>
            <Search className="h-4 w-4 text-cyan-500" aria-hidden />
            {t("synopsis")}
          </h2>
          {movie.overview && <p className="text-lg italic leading-relaxed text-zinc-400">“{movie.overview}”</p>}
        </div>

        <div className="group relative space-y-6 overflow-hidden rounded-[3rem] border border-white/5 bg-zinc-900/30 p-8 backdrop-blur-sm">
          <Sparkles className="absolute top-4 right-4 h-12 w-12 text-cyan-500 opacity-10 transition-opacity group-hover:opacity-20" />
          <h2 className={type.meta}>{t("details")}</h2>
          <dl className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("runtime")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">
                {movie.runtime ? t("runtimeValue", { minutes: movie.runtime }) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("released")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">{released ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-tighter text-zinc-600">{t("rating")}</dt>
              <dd className="text-sm font-bold tracking-widest text-white">{(movie.vote_average ?? 0).toFixed(1)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </PageShell>
  );
}
```

## `app/movies/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllMovies } from "@/action/get-all-movies.action";
import { ControlDivider, MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { resolveSort } from "@/lib/filters";

type SearchParams = { page?: string; sort?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("movies") };
}

export default async function MoviesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "movie");
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.movies"),
    getAllMovies(page, sort, genre, year, "movie"),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <>
            <AdvancedFilter mediaType="movie" />
            <ControlDivider />
            <SortDropdown mediaType="movie" />
          </>
        }
      />
      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/movies"
        searchParams={params}
        resetHref="/movies"
      />
    </PageShell>
  );
}
```

## `app/new-popular/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getNewAndPopular } from "@/action/get-new-popular.action";
import { MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";

type SearchParams = { page?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("newPopular") };
}

export default async function NewPopularPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";
  const filtered = genre !== "all" || year !== "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.newPopular"),
    getNewAndPopular(page, genre, year),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("subtitle")}
        actions={<AdvancedFilter mediaType="movie" />}
      />
      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/new-popular"
        searchParams={params}
        emptyTitle={filtered ? undefined : t("empty")}
        resetHref={filtered ? "/new-popular" : undefined}
      />
    </PageShell>
  );
}
```

## `app/not-found.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("notFound"), robots: { index: false } };
}

/**
 * Now a server component: the old version was a client component running a
 * glitch `setInterval` every 3s, and linked with a raw <a> (full reload).
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-black py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <Container className="relative z-10 flex flex-col items-center space-y-8 text-center">
        <h1 className="text-7xl font-black uppercase italic leading-none tracking-tighter text-white md:text-8xl">
          {t("title")}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        <div className="space-y-3">
          <h2 className={type.h2}>{t("heading")}</h2>
          <p className={cn(type.body, "mx-auto max-w-md")}>{t("body")}</p>
        </div>
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-500"
        >
          <MoveLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {t("cta")}
        </Link>
      </Container>
    </main>
  );
}
```

## `app/page.tsx`

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getFeatured } from "@/action/get-featured.action";
import { getGenres } from "@/action/get-genres.action";
import { getLatestMovies } from "@/action/get-latest-movies.action";
import { getTopRatedMovies } from "@/action/get-top-rated-movies.action";
import { getTrendingHero } from "@/action/get-trending-hero.action";
import { getTrendingTV } from "@/action/get-trending-TV.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import FeaturedBanner from "@/components/featured-banner";
import GenreCard from "@/components/genre-card";
import HeroSlider from "@/components/hero-slider";
import HomeCTA from "@/components/home-cta";
import { Container } from "@/components/layout/container";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SectionHeader } from "@/components/layout/page-header";
import MovieRow from "@/components/movie-row";
import { spacing } from "@/lib/typography";

const HOME_GENRES = 10;

export default async function HomePage() {
  const t = await getTranslations("home");

  // PERF: the six TMDB requests used to run one after another (waterfall).
  // They now run in parallel and are cached with `revalidate`.
  const [heroMovies, topMovies, genres, topTV, featured, latestMovies] = await Promise.all([
    getTrendingHero(),
    getTopRatedMovies(),
    getGenres(HOME_GENRES),
    getTrendingTV(),
    getFeatured(),
    getLatestMovies(),
  ]);

  if (heroMovies.length === 0 && topMovies.length === 0) {
    return (
      <PageShell>
        <EmptyState title={t("loadError")} />
      </PageShell>
    );
  }

  return (
    <main className="relative min-h-screen bg-black">
      {heroMovies.length > 0 && <HeroSlider trendingMovies={heroMovies} />}

      <div className="relative">
        <MovieRow title={t("topFilms")} movies={topMovies} type="movie" priority />

        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>

        {genres.length > 0 && (
          <section className={spacing.section} aria-labelledby="home-genres">
            <Container className="space-y-8">
              <SectionHeader
                id="home-genres"
                eyebrow={t("genresEyebrow")}
                title={t("genresTitle")}
                action={
                  <Link
                    href="/genres"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-colors hover:border-cyan-500/50 sm:px-5"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 transition-colors group-hover:text-white">
                      {t("genresViewAll")}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
                {genres.map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>
            </Container>
          </section>
        )}

        <MovieRow title={t("topTv")} movies={topTV} type="tv" />
        {featured && <FeaturedBanner movie={featured} />}
        <HomeCTA />
        <MovieRow title={t("latest")} movies={latestMovies} type="movie" />
      </div>
    </main>
  );
}
```

## `app/premium/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check, Lock, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const PLANS = ["free", "plus", "family"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("premium") };
}

/**
 * Premium is not live yet: no prices are invented ("price at launch"), paid
 * CTAs are disabled, and "Notify me" goes to the contact form.
 */
export default async function PremiumPage() {
  const t = await getTranslations("premium");
  const faq = t.raw("faq") as { q: string; a: string }[];

  return (
    <PageShell>
      <header className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[2.5rem] border border-white/5 bg-linear-to-b from-zinc-900 to-black px-6 py-14 text-center sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[100px]" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" aria-hidden />
          {t("badge")}
        </span>
        <h1 className={cn(type.display, "relative")}>
          {t("title")} <span className="text-cyan-500">{t("accent")}</span>
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        <p className={cn(type.body, "relative max-w-2xl")}>{t("description")}</p>
        <Link
          href="/contact?topic=premium"
          className="relative inline-flex items-center gap-3 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_40px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 active:scale-[0.98]"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {t("notify")}
        </Link>
      </header>

      <section id="plans" aria-labelledby="plans-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="plans-title" title={t("plansTitle")} eyebrow={t("plansDescription")} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isFree = plan === "free";
            const featured = plan === "plus";
            const features = t.raw(`plans.${plan}.features`) as string[];
            return (
              <article
                key={plan}
                className={cn(
                  "relative flex flex-col gap-6 rounded-4xl border p-8",
                  featured ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_60px_-20px_rgba(6,182,212,0.4)]" : "border-white/5 bg-zinc-950",
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                    {t("recommended")}
                  </span>
                )}
                <div className="space-y-2">
                  <h3 className={cn(type.h3, "flex items-center gap-2")}>
                    {!isFree && <Sparkles className="h-4 w-4 text-cyan-500" aria-hidden />}
                    {t(`plans.${plan}.name`)}
                  </h3>
                  <p className={type.body}>{t(`plans.${plan}.tagline`)}</p>
                </div>
                <p className="text-3xl font-black tracking-tight text-white">
                  {isFree ? t("free") : <span className="text-xl text-zinc-400">{t("priceTba")}</span>}
                </p>
                <ul className="flex-1 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed",
                    isFree ? "border-white/20 text-white" : "border-white/10 text-zinc-500",
                  )}
                >
                  {!isFree && <Lock className="h-3.5 w-3.5" aria-hidden />}
                  {isFree ? t("current") : t("unavailable")}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="premium-faq" className="mx-auto w-full max-w-3xl space-y-6">
        <SectionHeader id="premium-faq" title={t("faqTitle")} />
        <div className="space-y-3">
          {faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-white/5 bg-zinc-950 p-5 open:border-cyan-500/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white">
                {item.q}
                <span aria-hidden className="text-cyan-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className={cn(type.prose, "mt-3")}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
```

## `app/privacy/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage from "@/components/support/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("privacy") };
}

export default function PrivacyPage() {
  return <LegalPage doc="privacy" />;
}
```

## `app/search/[query]/page.tsx`

```tsx
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSearchResults } from "@/action/get-search-results.action";
import { MediaListing } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function SearchPage({ params }: { params: Params }) {
  const { query } = await params;
  const decodedQuery = safeDecode(query);
  const [t, results] = await Promise.all([getTranslations("search"), getSearchResults(decodedQuery)]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("resultsEyebrow")}
        title={`“${decodedQuery}”`}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/40 px-4 py-2">
            <Sparkles className="h-3 w-3 text-cyan-500" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {t("matches", { count: results.length })}
            </span>
          </span>
        }
      />
      {/* BUG FIX: multi-search mixes movies and series; each card now routes
          to the right section instead of always /movies/<id>. */}
      <MediaListing
        items={results}
        kind="auto"
        page={1}
        totalPages={1}
        basePath={`/search/${encodeURIComponent(decodedQuery)}`}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query: decodedQuery })}
      />
    </PageShell>
  );
}
```

## `app/sign-in/[[...sign-in]]/page.tsx`

```tsx
import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthShell, resolveReturnTo, type AuthSearchParams } from "@/components/auth/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("signIn"), robots: { index: false } };
}

/**
 * AUTH FIX: the destination is forced for sign-in AND for the sign-up flow
 * started from here (and kept when switching to /sign-up), so OAuth and
 * account creation also return to the original watch page.
 */
export default async function SignInPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = await resolveReturnTo(searchParams);
  const signUpUrl = returnTo === "/" ? "/sign-up" : `/sign-up?redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell>
      <SignIn forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} signUpUrl={signUpUrl} />
    </AuthShell>
  );
}
```

## `app/sign-up/[[...sign-up]]/page.tsx`

```tsx
import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { AuthShell, resolveReturnTo, type AuthSearchParams } from "@/components/auth/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("signUp"), robots: { index: false } };
}

/** AUTH FIX: sign-up used to ignore the return URL entirely. */
export default async function SignUpPage({ searchParams }: { searchParams: AuthSearchParams }) {
  const returnTo = await resolveReturnTo(searchParams);
  const signInUrl = returnTo === "/" ? "/sign-in" : `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;

  return (
    <AuthShell>
      <SignUp forceRedirectUrl={returnTo} signInForceRedirectUrl={returnTo} signInUrl={signInUrl} />
    </AuthShell>
  );
}
```

## `app/terms/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage from "@/components/support/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("terms") };
}

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
```

## `app/trailer/[id]/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Globe, MonitorPlay, ShieldAlert, X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getMovieTrailer } from "@/action/get-movie-trailer.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageShell } from "@/components/layout/page-shell";
import TrailerAdEngine from "@/components/trailer-ad-engine";
import { localeMeta, isLocale, type Locale } from "@/i18n/config";
import { getWatchHref, type MediaKind } from "@/lib/media";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ type?: string; fallback?: string; lang?: string }>;

const toKind = (value?: string): MediaKind => (value === "anime" ? "anime" : value === "tv" ? "tv" : "movie");

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("trailer"), robots: { index: false } };
}

export default async function TrailerPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp, uiLocale, t] = await Promise.all([params, searchParams, getLocale(), getTranslations("trailer")]);
  const kind = toKind(sp.type);
  const requested: Locale = isLocale(sp.lang) ? sp.lang : (uiLocale as Locale);

  const trailer = await getMovieTrailer(id, requested, kind);
  const currentLang: Locale = trailer?.lang === "fr" ? "fr" : trailer?.lang === "en" ? "en" : requested;
  const nextLang: Locale = currentLang === "fr" ? "en" : "fr";

  // BUG FIX: `fallback=undefined` used to be appended literally when missing.
  const watchHref = getWatchHref(id, kind, sp.fallback);
  const switchParams = new URLSearchParams({ lang: nextLang, type: kind });
  if (sp.fallback) switchParams.set("fallback", sp.fallback);

  return (
    <PageShell containerClassName="max-w-6xl">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="group flex min-w-0 items-center gap-4">
          <span className="rounded-xl border border-white/10 p-2 transition-all group-hover:border-cyan-500 group-hover:bg-cyan-500/5">
            <ChevronLeft className="h-5 w-5 text-zinc-500 group-hover:text-cyan-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{t("back")}</span>
        </Link>
        <Link
          href={watchHref}
          aria-label={t("start")}
          className="group rounded-full bg-white/5 p-2 transition-colors hover:bg-red-500/10"
        >
          <X className="h-6 w-6 text-zinc-600 transition-all duration-300 group-hover:rotate-90 group-hover:text-red-500" />
        </Link>
      </header>

      <div className="relative aspect-video max-h-[77vh] w-full overflow-hidden border border-white/5 bg-black shadow-[0_0_80px_-20px_rgba(6,182,212,0.15)]">
        {trailer?.key ? (
          <TrailerAdEngine trailerKey={trailer.key} lang={currentLang} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#050505] px-6 text-center">
            <ShieldAlert className="h-10 w-10 text-zinc-700" aria-hidden />
            <p className="text-sm text-zinc-500">{t("unavailable")}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col items-center justify-center gap-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-xl shadow-cyan-500/5 lg:col-span-8">
          <Link
            href={watchHref}
            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-white py-6 text-black transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            <MonitorPlay className="h-5 w-5" />
            <span className="text-xs font-black uppercase tracking-[0.4em]">{t("start")}</span>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 rounded-4xl border border-white/5 bg-white/2 p-8 backdrop-blur-sm lg:col-span-4">
          <Link
            href={`/trailer/${id}?${switchParams.toString()}`}
            className="w-full rounded-xl border border-white/10 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all hover:border-cyan-500 hover:bg-cyan-500/5 hover:text-cyan-500"
          >
            {t("switchTo", { lang: localeMeta[nextLang].nativeName })}
          </Link>
          <p className="flex items-center gap-3">
            <Globe className="h-3 w-3 text-zinc-600" aria-hidden />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">
              {t("language")}: {localeMeta[currentLang].nativeName}
            </span>
          </p>
        </div>
      </div>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
```

## `app/tv-shows/page.tsx`

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllTVShows } from "@/action/get-all-tv.action";
import { ControlDivider, MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { resolveSort } from "@/lib/filters";

type SearchParams = { page?: string; sort?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("tvShows") };
}

/**
 * BUG FIX: this page used movie genres/sorts (filters silently did nothing)
 * and its cards opened /movies/<tvId>, i.e. the wrong title.
 */
export default async function TVShowsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "tv");
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.tvShows"),
    getAllTVShows(page, sort, genre, year),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <>
            <AdvancedFilter mediaType="tv" />
            <ControlDivider />
            <SortDropdown mediaType="tv" />
          </>
        }
      />
      <MediaListing
        items={data.results}
        kind="tv"
        page={page}
        totalPages={data.total_pages}
        basePath="/tv-shows"
        searchParams={params}
        resetHref="/tv-shows"
      />
    </PageShell>
  );
}
```

## Deleted files

- `components/anime-player.tsx`
- `components/anime-search.tsx`
- `components/custom-link.tsx`
- `components/drama-player.tsx`
- `components/kdrama-search.tsx`
- `components/language-selector.tsx`
- `components/movies/video-player.tsx`
