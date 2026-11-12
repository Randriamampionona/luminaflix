import "server-only";

/**
 * VIDZY availability — official API only (https://api.vidzy.org):
 *
 *   GET https://vidzy.org/api/{tmdbId}
 *   → { "available": true, "detectedType": "movie", "languages": ["vf", "vostfr"], … }
 *   → { "available": false, "tmdb_id": 964284 }
 *
 * Live, no cache. Time budget: the whole check stops after `budgetMs` (default
 * 8 s) and answers with what it knows. Retries ONLY after a real "no" (to get
 * past a stale "no" in a cache on the way — with a unique query parameter); a
 * timeout / error isn't retried (a server that doesn't answer won't answer faster).
 *
 *  - "available": true + right type + vf / vostfr → VIDZY has it;
 *  - "available": false / 404 on every attempt → VIDZY doesn't have it;
 *  - no valid answer in time → unknown (null): VIDZY is then not offered.
 */
export type FrLang = "vf" | "vostfr";
interface VidzyAnswer {
  available: boolean | null;
  langs: FrLang[];
}

const BASE = (process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org").replace(/\/+$/, "");
const FR: FrLang[] = ["vf", "vostfr"];
const ATTEMPT_TIMEOUT_MS = 3000;
const HEADERS = {
  Accept: "application/json",
  "Cache-Control": "no-cache, no-store",
  Pragma: "no-cache",
  "User-Agent": "Mozilla/5.0 (compatible; LuminaFlix/1.0; +https://www.lumina-flix.live)",
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ApiAnswer {
  available?: unknown;
  detectedType?: unknown;
  languages?: unknown;
}

/** One live request (≤ 3 s and ≤ the time left); null when there's no valid JSON answer. */
async function request(tmdbId: string, attempt: number, timeoutMs: number): Promise<ApiAnswer | "not-found" | null> {
  const bust = attempt > 1 ? `?_=${Date.now()}${attempt}` : "";
  try {
    const res = await fetch(`${BASE}/api/${encodeURIComponent(tmdbId)}${bust}`, {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status === 404) return "not-found";
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data && typeof data === "object" ? (data as ApiAnswer) : null;
  } catch {
    return null;
  }
}

function read(data: ApiAnswer | "not-found", isMovie: boolean): VidzyAnswer {
  if (data === "not-found" || data.available !== true) return { available: false, langs: [] };
  const type = typeof data.detectedType === "string" ? data.detectedType.toLowerCase() : "";
  // A TMDB id can be a movie and a series at the same time: the type must match.
  if (type && (isMovie ? type !== "movie" : type === "movie")) return { available: false, langs: [] };
  const languages = Array.isArray(data.languages) ? data.languages.map((l) => String(l).toLowerCase()) : [];
  const langs = FR.filter((l) => languages.includes(l)).sort((a, b) => languages.indexOf(a) - languages.indexOf(b));
  return langs.length ? { available: true, langs } : { available: false, langs: [] };
}

export async function checkVidzy(
  tmdbId: string,
  isMovie: boolean,
  { attempts = 4, budgetMs = 8000 }: { attempts?: number; budgetMs?: number } = {},
): Promise<VidzyAnswer> {
  const deadline = Date.now() + budgetMs;
  let sawNo = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await pause(250);
    const left = deadline - Date.now();
    if (left < 300) break;
    const data = await request(tmdbId, attempt, Math.min(ATTEMPT_TIMEOUT_MS, left));
    if (data === null) break; // timeout / error: no retry
    const answer = read(data, isMovie);
    if (answer.available) return answer;
    sawNo = true; // a real "no": ask again, past any cache
  }
  return sawNo ? { available: false, langs: [] } : { available: null, langs: [] };
}
