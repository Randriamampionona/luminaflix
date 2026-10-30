/**
 * French (VF / VOSTFR) availability of a title or episode — VIDZY first, then
 * Frembed. Used by the player (app/api/player/availability), the "French
 * only" listing filter (app/api/fr-availability) and the "Notify me" alerts.
 * VIDZY: https://vidzy.org/api/{tmdbId} (languages, seasons) · Frembed: public JSON API.
 */
import "server-only";

const clean = (url: string) => url.replace(/\/+$/, "");
const VIDZY = clean(process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org");
const FREMBED_API = `${clean(process.env.NEXT_PUBLIC_FREMBED_BASE_URL || process.env.FREMBED_BASE_URL || "https://frembed.bar")}/api/public/v1`;
const CACHE_SECONDS = 600;
const FR_LANGS = ["vf", "vostfr"] as const;

export type FrKind = "movie" | "anime" | "drama" | "tv";
type Kind = FrKind;
type FrLang = (typeof FR_LANGS)[number];
type Check = { available: boolean | null; version: string | null };
type FrAvailabilityResult = Check & {
  provider: "vidzy" | "frembed" | null;
  langs: FrLang[];
  lang: FrLang | null;
};

async function getJson<T>(url: string): Promise<T | "not-found" | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return "not-found";
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ VIDZY --

interface VidzyResponse {
  available?: boolean;
  detectedType?: string;
  languages?: unknown;
  seasons?: { season?: number; episodes?: number[] }[];
}

async function checkVidzy(
  kind: Kind,
  id: string,
  season: number,
  episode: number,
): Promise<{ available: boolean | null; langs: FrLang[] }> {
  const data = await getJson<VidzyResponse>(`${VIDZY}/api/${id}`);
  if (data === null) return { available: null, langs: [] };
  if (data === "not-found" || data.available !== true) return { available: false, langs: [] };
  // Same id can be a movie on TMDB and a series: only accept the right type.
  if (data.detectedType && data.detectedType !== (kind === "movie" ? "movie" : "tv")) {
    return { available: false, langs: [] };
  }
  // Every French language, in VIDZY's own order (["vf", "vostfr"] → VF first, then VOSTFR).
  const languages = Array.isArray(data.languages) ? data.languages.map((l) => String(l).toLowerCase()) : [];
  const langs = FR_LANGS.filter((l) => languages.includes(l)).sort(
    (a, b) => languages.indexOf(a) - languages.indexOf(b),
  );
  if (!langs.length) return { available: false, langs: [] };
  if (kind !== "movie" && Array.isArray(data.seasons)) {
    const s = data.seasons.find((x) => x.season === season);
    if (!s?.episodes?.includes(episode)) return { available: false, langs: [] };
  }
  return { available: true, langs };
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

/** Availability of a movie / episode (s, e ignored for movies). */
export async function checkFrAvailability(
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
    };
  }
  if (frembedCheck.available) {
    return { available: true, provider: "frembed", langs: [], lang: null, version: frembedCheck.version };
  }
  if (vidzy.available === false && frembedCheck.available === false) {
    return { available: false, provider: null, langs: [], lang: null, version: null };
  }
  // One of the two couldn't be reached: don't claim "not available in French".
  return { available: null, provider: null, langs: [], lang: null, version: null };
}

export const FR_CACHE_SECONDS = CACHE_SECONDS;
