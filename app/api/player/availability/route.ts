/**
 * GET /api/player/availability?kind=movie|anime|drama&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode>
 * → { available: true | false | null, provider: "vidzy" | "frembed" | null, langs: ("vf" | "vostfr")[], lang, version }
 *
 * Which French (VF / VOSTFR) player has this title / episode, in this order:
 * 1. VIDZY  — https://vidzy.org/api/{tmdbId} (TMDB ids only): `available`, `detectedType`,
 *    `languages` (every "vf" / "vostfr" in VIDZY's order → one VIDZY server each), `seasons[].episodes` for series.
 * 2. FREMBED — public JSON API (https://frembed.bar/api-docs):
 *    movies /api/public/v1/movies/{id} (total), series /tv/{id}?sa=&epi= (totalItems),
 *    anime /anime/{id}?sa=&epi= (404 when absent, /tv as a fallback).
 * Both are asked at the same time; VIDZY wins when it has the title.
 * `available: false` = neither has it (the player offers an English server);
 * `null` = couldn't tell (an API down / timeout): the player behaves as before.
 *
 * Results are cached 10 min (server + CDN): one call per title, not per viewer.
 */
const clean = (url: string) => url.replace(/\/+$/, "");
const VIDZY = clean(process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org");
const FREMBED_API = `${clean(process.env.NEXT_PUBLIC_FREMBED_BASE_URL || process.env.FREMBED_BASE_URL || "https://frembed.bar")}/api/public/v1`;
const CACHE_SECONDS = 600;
const FR_LANGS = ["vf", "vostfr"] as const;

type Kind = "movie" | "anime" | "drama" | "tv";
type FrLang = (typeof FR_LANGS)[number];
type Check = { available: boolean | null; version: string | null };
type Result = Check & { provider: "vidzy" | "frembed" | null; langs: FrLang[]; lang: FrLang | null };

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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as Kind;
  const id = params.get("id") ?? "";
  const imdb = params.get("imdb") ?? "";
  const season = Number(params.get("s") || 1);
  const episode = Number(params.get("e") || 1);

  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(id)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const [vidzy, frembedCheck] = await Promise.all([
    checkVidzy(kind, id, season, episode),
    checkFrembed(kind, id, imdb, season, episode),
  ]);

  let result: Result;
  if (vidzy.available) {
    result = {
      available: true,
      provider: "vidzy",
      langs: vidzy.langs,
      lang: vidzy.langs[0],
      version: vidzy.langs.map((l) => l.toUpperCase()).join(" + "),
    };
  } else if (frembedCheck.available) {
    result = { available: true, provider: "frembed", langs: [], lang: null, version: frembedCheck.version };
  } else if (vidzy.available === false && frembedCheck.available === false) {
    result = { available: false, provider: null, langs: [], lang: null, version: null };
  } else {
    // One of the two couldn't be reached: don't claim "not available in French".
    result = { available: null, provider: null, langs: [], lang: null, version: null };
  }

  return Response.json(result, {
    headers: {
      // Unknown answers aren't cached, so a short outage doesn't stick.
      "Cache-Control":
        result.available === null
          ? "no-store"
          : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 6}`,
    },
  });
}
