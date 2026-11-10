/**
 * French (VF / VOSTFR) availability of a title or episode — VIDZY first, then
 * Frembed. Used by the player (app/api/player/availability), the "French
 * only" listing filter (app/api/fr-availability) and the "Notify me" alerts.
 * VIDZY: https://vidzy.org/api/{tmdbId} (languages, seasons) · Frembed: public JSON API.
 *
 * Reliability rules (a short VIDZY outage once made every title look
 * "not available in French" for a while):
 *  - every request is made fresh (no fetch cache) with a 6 s timeout and one
 *    retry, and an error / timeout counts as "unknown", never as "not available";
 *  - only POSITIVE answers are cached (10 min, server side); "not available"
 *    is checked again on every request, so a title shows up as soon as the
 *    provider has it (or is back up).
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { readVidzy, VIDZY_BASE, type FrLang, type VidzyCheck, type VidzyResponse } from "@/lib/vidzy";

const clean = (url: string) => url.replace(/\/+$/, "");
const VIDZY = VIDZY_BASE;
const FREMBED_API = `${clean(process.env.NEXT_PUBLIC_FREMBED_BASE_URL || process.env.FREMBED_BASE_URL || "https://frembed.bar")}/api/public/v1`;
const CACHE_SECONDS = 600;

export type FrKind = "movie" | "anime" | "drama" | "tv";
type Kind = FrKind;
type Check = { available: boolean | null; version: string | null };
type FrAvailabilityResult = Check & {
  provider: "vidzy" | "frembed" | null;
  langs: FrLang[];
  lang: FrLang | null;
  /**
   * VIDZY player to use instead of the usual /serie/{id}/{s}/{e} one, when VIDZY
   * lists a series season as a single "movie" entry (e.g. "See - Saison 1",
   * embed https://vidzy.org/movie/80752). The player adds /vf or /vostfr.
   */
  embed: string | null;
  /**
   * VIDZY's own answer, even when Frembed has the title: true / false, or null
   * when VIDZY couldn't be reached from the server — the player then still
   * offers VIDZY (and the browser asks VIDZY itself).
   */
  vidzy: boolean | null;
};

const HEADERS = {
  Accept: "application/json",
  // Some providers' firewalls reject requests without a browser-like user agent.
  "User-Agent": "Mozilla/5.0 (compatible; LuminaFlix/1.0; +https://www.lumina-flix.live)",
};

/** Wait asked by the provider (HTTP 429 Retry-After), capped. */
let retryAfterMs = 0;

async function getJsonOnce<T>(url: string): Promise<T | "not-found" | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), headers: HEADERS });
    if (res.status === 404) return "not-found";
    if (res.status === 429) {
      // Too many requests: wait as asked (max 2 s) before the retry.
      retryAfterMs = Math.min(2000, Math.max(500, Number(res.headers.get("retry-after")) * 1000 || 1000));
      return null;
    }
    if (!res.ok) return null; // 403 / 429 / 5xx: provider unreachable → "unknown"
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return null; // HTML error / challenge page → "unknown"
    }
  } catch {
    return null; // timeout / network error → "unknown"
  }
}

/** One retry (after 400 ms) when the answer is an error or "not found". */
async function getJson<T>(url: string): Promise<T | "not-found" | null> {
  const first = await getJsonOnce<T>(url);
  if (first !== null && first !== "not-found") return first;
  const wait = retryAfterMs || 400;
  retryAfterMs = 0;
  await new Promise((resolve) => setTimeout(resolve, wait));
  const second = await getJsonOnce<T>(url);
  // Keep the more informative answer: data > "not-found" > unknown.
  return second !== null ? second : first;
}

// ------------------------------------------------------------------ VIDZY --

async function checkVidzy(kind: Kind, id: string, season: number, episode: number): Promise<VidzyCheck> {
  const data = await getJson<VidzyResponse>(`${VIDZY}/api/${id}`);
  if (data === null) return { available: null, langs: [], embed: null };
  return readVidzy(data, kind === "movie", season, episode);
}

// ---------------------------------------------------------------- FREMBED --

interface FrembedResponse {
  status?: number;
  result?: { total?: number; totalItems?: number; items?: { version?: string | null }[] };
}

const frembed = (path: string) => getJson<FrembedResponse>(`${FREMBED_API}${path}`);

function toCheck(data: FrembedResponse | "not-found" | null): Check {
  if (data === null) return { available: null, version: null };
  if (data === "not-found") return { available: false, version: null };
  const count = data.result?.total ?? data.result?.totalItems ?? 0;
  return { available: count > 0, version: data.result?.items?.[0]?.version ?? null };
}

/** First positive answer wins; "unknown" only if nothing could be checked. */
function combine(...checks: Check[]): Check {
  return (
    checks.find((c) => c.available === true) ??
    checks.find((c) => c.available === false) ?? { available: null, version: null }
  );
}

async function checkFrembed(kind: Kind, id: string, imdb: string, season: number, episode: number): Promise<Check> {
  if (kind === "movie") {
    // Frembed has two FR players for movies (TMDB and IMDb ids): available if either id is known.
    const byTmdb = toCheck(await frembed(`/movies/${id}`));
    return byTmdb.available !== true && /^tt\d{5,10}$/.test(imdb)
      ? combine(byTmdb, toCheck(await frembed(`/movies/${imdb}`)))
      : byTmdb;
  }
  const query = `?sa=${season}&epi=${episode}`;
  if (kind === "anime") {
    const asAnime = toCheck(await frembed(`/anime/${id}${query}`));
    return asAnime.available === true ? asAnime : combine(asAnime, toCheck(await frembed(`/tv/${id}${query}`)));
  }
  return toCheck(await frembed(`/tv/${id}${query}`));
}

/** Thrown inside the cache so that only positive answers are stored. */
class NotPositive extends Error {
  constructor(readonly result: FrAvailabilityResult) {
    super("not available");
  }
}

/**
 * Availability of a movie / episode (s, e ignored for movies). Positive
 * answers are cached 10 min; negative / unknown ones are always re-checked.
 */
export async function checkFrAvailability(
  kind: FrKind,
  id: string,
  options: { imdb?: string; season?: number; episode?: number } = {},
): Promise<FrAvailabilityResult> {
  const { imdb = "", season = 1, episode = 1 } = options;
  try {
    return await unstable_cache(
      async () => {
        const result = await checkNow(kind, id, { imdb, season, episode });
        // Only complete positive answers are kept: available AND VIDZY's own
        // answer known (a "Frembed yes, VIDZY unreachable" answer is re-checked).
        if (result.available !== true || result.vidzy === null) throw new NotPositive(result);
        return result;
      },
      ["fr-availability-v3", kind, id, imdb, String(season), String(episode)],
      { revalidate: CACHE_SECONDS },
    )();
  } catch (error) {
    if (error instanceof NotPositive) return error.result;
    return checkNow(kind, id, { imdb, season, episode });
  }
}

async function checkNow(
  kind: FrKind,
  id: string,
  { imdb = "", season = 1, episode = 1 }: { imdb?: string; season?: number; episode?: number } = {},
): Promise<FrAvailabilityResult> {
  const [vidzy, frembedCheck] = await Promise.all([
    checkVidzy(kind, id, season, episode),
    checkFrembed(kind, id, imdb, season, episode),
  ]);
  if (vidzy.available) {
    return {
      available: true,
      provider: "vidzy",
      langs: vidzy.langs,
      lang: vidzy.langs[0],
      version: vidzy.langs.map((l) => l.toUpperCase()).join(" + "),
      embed: vidzy.embed,
      vidzy: true,
    };
  }
  if (frembedCheck.available) {
    return {
      available: true,
      provider: "frembed",
      langs: [],
      lang: null,
      version: frembedCheck.version,
      embed: null,
      vidzy: vidzy.available,
    };
  }
  if (vidzy.available === false && frembedCheck.available === false) {
    return { available: false, provider: null, langs: [], lang: null, version: null, embed: null, vidzy: false };
  }
  // One of the two couldn't be reached: don't claim "not available in French".
  return { available: null, provider: null, langs: [], lang: null, version: null, embed: null, vidzy: vidzy.available };
}

export const FR_CACHE_SECONDS = CACHE_SECONDS;
