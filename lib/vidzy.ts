import "server-only";

/**
 * VIDZY availability — official API only (https://api.vidzy.org):
 *
 *   GET https://vidzy.org/api/{tmdbId}
 *   → { "available": true, "detectedType": "movie", "languages": ["vf", "vostfr"], … }
 *   → { "available": false, "tmdb_id": 964284 }
 *
 * No cache anywhere: every call asks the API live (no-cache headers, and from the
 * 2nd attempt a unique query parameter so no CDN in between can answer from cache).
 * Before saying "not available", the API is asked up to `attempts` times
 * (default 4): a single "no" or error is never trusted on its own.
 *
 *  - "available": true + right type + vf / vostfr → VIDZY has it (stops at once);
 *  - only "available": false / 404 on every attempt → VIDZY doesn't have it;
 *  - no valid answer at all → unknown (VIDZY is then not offered).
 */
export type FrLang = "vf" | "vostfr";
interface VidzyAnswer {
  available: boolean | null;
  langs: FrLang[];
}

const BASE = (process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org").replace(/\/+$/, "");
const FR: FrLang[] = ["vf", "vostfr"];
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

/** One live request; null when there's no valid JSON answer. */
async function request(tmdbId: string, attempt: number): Promise<ApiAnswer | "not-found" | null> {
  const bust = attempt > 1 ? `?_=${Date.now()}${attempt}` : "";
  try {
    const res = await fetch(`${BASE}/api/${encodeURIComponent(tmdbId)}${bust}`, {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
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

export async function checkVidzy(tmdbId: string, isMovie: boolean, attempts = 4): Promise<VidzyAnswer> {
  let sawNo = false;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await pause(300 * (attempt - 1));
    const data = await request(tmdbId, attempt);
    if (data === null) continue;
    const answer = read(data, isMovie);
    if (answer.available) return answer;
    sawNo = true;
  }
  return sawNo ? { available: false, langs: [] } : { available: null, langs: [] };
}
