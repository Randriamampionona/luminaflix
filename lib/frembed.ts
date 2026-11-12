import "server-only";

/**
 * Frembed availability — official API only (https://frembed.uno/api-docs):
 *
 *   Movie:   GET {base}/api/public/v1/movies/{id}            → available if result.total > 0
 *            (TMDB id and IMDb id "tt…" checked separately, in parallel: each
 *             Frembed movie server (TMDB / IMDb) is offered only if its own id is found)
 *   Episode: GET {base}/api/public/v1/tv/{id}?sa={s}&epi={e} → available if result.totalItems > 0
 *   Anime:   GET {base}/api/public/v1/anime/{id}?sa=&epi=    → 404 = not an anime → then /tv/{id}
 *   "Not found" is HTTP 200 with total / totalItems = 0 (per the docs).
 *
 * Live, no cache. Time budget: the whole check stops after `budgetMs` (default
 * 8 s). Retries ONLY after a real "not found" (with a unique query parameter,
 * to get past Frembed's own 2-min cache); a timeout / error isn't retried —
 * except once on Frembed's current domain (asked live from GET /api/domain,
 * as the docs advise), in case the domain changed.
 * No valid answer in time → unknown (null): Frembed is then not offered.
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
const ATTEMPT_TIMEOUT_MS = 3000;
const HEADERS = {
  Accept: "application/json",
  "Cache-Control": "no-cache, no-store",
  Pragma: "no-cache",
  "User-Agent": "Mozilla/5.0 (compatible; LuminaFlix/1.0; +https://www.lumina-flix.live)",
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url: string, timeoutMs: number): Promise<{ status: number; data: unknown } | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: HEADERS, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 404) return { status: 404, data: null };
    if (!res.ok) return null;
    return { status: res.status, data: await res.json() };
  } catch {
    return null;
  }
}

/** Current Frembed domain, asked live. */
async function currentBase(timeoutMs: number): Promise<string | null> {
  const answer = await getJson(`${DEFAULT_BASE}/api/domain?_=${Date.now()}`, timeoutMs);
  const domain = (answer?.data as { domain?: unknown } | null)?.domain;
  return typeof domain === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? `https://${domain}` : null;
}

interface Listing {
  result?: { total?: unknown; totalItems?: unknown; items?: { version?: unknown }[] };
}
type Lookup = { found: boolean; version: string | null } | null;

/** One live lookup on one domain. */
async function lookupOnce(base: string, path: string, attempt: number, timeoutMs: number): Promise<Lookup> {
  const sep = path.includes("?") ? "&" : "?";
  const bust = attempt > 1 ? `${sep}_=${Date.now()}${attempt}` : "";
  const answer = await getJson(`${base}/api/public/v1${path}${bust}`, timeoutMs);
  if (answer === null) return null;
  if (answer.status === 404) return { found: false, version: null };
  const data = answer.data as Listing | null;
  if (!data || typeof data !== "object" || !data.result) return null;
  const count = Number(data.result.total ?? data.result.totalItems ?? 0);
  const version = data.result.items?.[0]?.version;
  return { found: count > 0, version: count > 0 && typeof version === "string" ? version : null };
}

/** Up to `attempts` lookups before `deadline`; stops at the first "found". */
async function lookup(path: string, attempts: number, deadline: number): Promise<Lookup> {
  let base = DEFAULT_BASE;
  let sawNo = false;
  let triedDomain = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await pause(250);
    const left = deadline - Date.now();
    if (left < 300) break;
    const answer = await lookupOnce(base, path, attempt, Math.min(ATTEMPT_TIMEOUT_MS, left));
    if (answer?.found) return answer;
    if (answer) {
      sawNo = true; // a real "not found": ask again, past Frembed's cache
      continue;
    }
    // Timeout / error: no retry — except once on Frembed's current domain if it changed.
    if (triedDomain || sawNo) break;
    triedDomain = true;
    const leftForDomain = deadline - Date.now();
    if (leftForDomain < 600) break;
    const current = await currentBase(Math.min(ATTEMPT_TIMEOUT_MS, leftForDomain));
    if (!current || current === base) break;
    base = current;
  }
  return sawNo ? { found: false, version: null } : null;
}

const yes = (a: Lookup) => (a === null ? null : a.found);

export async function checkFrembed(
  kind: "movie" | "tv" | "drama" | "anime",
  id: string,
  {
    imdb = "",
    season = 1,
    episode = 1,
    attempts = 4,
    budgetMs = 8000,
  }: { imdb?: string; season?: number; episode?: number; attempts?: number; budgetMs?: number } = {},
): Promise<FrembedAnswer> {
  const deadline = Date.now() + budgetMs;
  if (kind === "movie") {
    const [byTmdb, byImdb] = await Promise.all([
      lookup(`/movies/${encodeURIComponent(id)}`, attempts, deadline),
      /^tt\d{5,10}$/.test(imdb)
        ? lookup(`/movies/${imdb}`, attempts, deadline)
        : Promise.resolve({ found: false, version: null }),
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
  let answer: Lookup =
    kind === "anime" ? await lookup(`/anime/${encodeURIComponent(id)}${query}`, attempts, deadline) : null;
  if (!answer?.found) {
    const asTv = await lookup(`/tv/${encodeURIComponent(id)}${query}`, attempts, deadline);
    // Keep the more informative answer (a real "no" beats "no valid answer").
    answer = asTv ?? answer;
  }
  const found = yes(answer);
  return { available: found, tmdb: found, imdb: null, version: answer?.version ?? null };
}
