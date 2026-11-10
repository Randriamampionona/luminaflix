import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Frembed availability — official API only (https://frembed.uno/api-docs):
 *
 *   Movie:   GET {base}/api/public/v1/movies/{id}          → available if result.total > 0
 *            (id = TMDB id, or IMDb id "tt…" — checked separately: each Frembed
 *             movie server (TMDB / IMDb) is offered only if its own id is found)
 *   Episode: GET {base}/api/public/v1/tv/{id}?sa={s}&epi={e} → available if result.totalItems > 0
 *   Anime:   GET {base}/api/public/v1/anime/{id}?sa=&epi=   → 404 = not an anime → then /tv/{id}
 *   "Not found" is HTTP 200 with total / totalItems = 0 (per the docs).
 *
 * Domain: Frembed moves domain when one gets blocked; the current one comes from
 * GET {base}/api/domain → { "domain": "frembed.uno" } (cached 1 h), as the docs advise.
 * No valid answer (timeout, error, not JSON) → unknown (null): Frembed is then
 * NOT offered — only a confirmed answer shows a Frembed server.
 */
interface FrembedAnswer {
  /** Frembed has it (any of its ids) · false = it doesn't · null = no valid answer. */
  available: boolean | null;
  /** Movies: found by TMDB id / by IMDb id (each drives its own server). Series: tmdb only. */
  tmdb: boolean | null;
  imdb: boolean | null;
  /** "French", "TrueFrench", "VostFR", "VF", "VOSTFR", "VF_VOSTFR"… (first item) */
  version: string | null;
}

const DEFAULT_BASE = (process.env.FREMBED_BASE_URL || process.env.NEXT_PUBLIC_FREMBED_BASE_URL || "https://frembed.uno")
  .replace(/\/+$/, "")
  // The old domain is no longer the API's home.
  .replace(/frembed\.bar$/i, "frembed.uno");
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; LuminaFlix/1.0; +https://www.lumina-flix.live)",
};

async function getJson(url: string): Promise<{ status: number; data: unknown } | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) return { status: 404, data: null };
    if (!res.ok) return null;
    return { status: res.status, data: await res.json() };
  } catch {
    return null;
  }
}

/** Current Frembed domain (GET /api/domain), 1 h cache; falls back to the configured one. */
const frembedBase = unstable_cache(
  async () => {
    const answer = await getJson(`${DEFAULT_BASE}/api/domain`);
    const domain = (answer?.data as { domain?: unknown } | null)?.domain;
    return typeof domain === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? `https://${domain}` : DEFAULT_BASE;
  },
  ["frembed-domain-v1"],
  { revalidate: 3600 },
);

interface Listing {
  status?: number;
  result?: { total?: unknown; totalItems?: unknown; items?: { version?: unknown }[] };
}

/** One API call, one retry when there's no valid answer. */
async function call(path: string): Promise<{ found: boolean; version: string | null } | null> {
  const base = await frembedBase().catch(() => DEFAULT_BASE);
  let answer = await getJson(`${base}/api/public/v1${path}`);
  if (answer === null) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    answer = await getJson(`${base}/api/public/v1${path}`);
  }
  if (answer === null) return null;
  if (answer.status === 404) return { found: false, version: null };
  const data = answer.data as Listing | null;
  if (!data || typeof data !== "object" || !data.result) return null;
  const count = Number(data.result.total ?? data.result.totalItems ?? 0);
  const version = data.result.items?.[0]?.version;
  return { found: count > 0, version: count > 0 && typeof version === "string" ? version : null };
}

const yes = (a: { found: boolean } | null) => (a === null ? null : a.found);

export async function checkFrembed(
  kind: "movie" | "tv" | "drama" | "anime",
  id: string,
  { imdb = "", season = 1, episode = 1 }: { imdb?: string; season?: number; episode?: number } = {},
): Promise<FrembedAnswer> {
  if (kind === "movie") {
    const [byTmdb, byImdb] = await Promise.all([
      call(`/movies/${encodeURIComponent(id)}`),
      /^tt\d{5,10}$/.test(imdb) ? call(`/movies/${imdb}`) : Promise.resolve({ found: false, version: null }),
    ]);
    const tmdb = yes(byTmdb);
    const imdbFound = yes(byImdb);
    return {
      available: tmdb || imdbFound ? true : tmdb === false && imdbFound === false ? false : null,
      tmdb,
      imdb: imdbFound,
      version: byTmdb?.version ?? byImdb?.version ?? null,
    };
  }
  const query = `?sa=${season}&epi=${episode}`;
  let answer = kind === "anime" ? await call(`/anime/${encodeURIComponent(id)}${query}`) : null;
  if (!answer?.found) {
    const asTv = await call(`/tv/${encodeURIComponent(id)}${query}`);
    // Keep the more informative answer (a real "no" beats "no valid answer").
    answer = asTv ?? answer;
  }
  const found = yes(answer);
  return { available: found, tmdb: found, imdb: null, version: answer?.version ?? null };
}
