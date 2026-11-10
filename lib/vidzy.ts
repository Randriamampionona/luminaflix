import "server-only";

/**
 * VIDZY availability — official API only (https://api.vidzy.org):
 *
 *   GET https://vidzy.org/api/{tmdbId}
 *   → { "available": true, "detectedType": "movie", "title": "…", "year": 2006,
 *       "languages": ["vf", "vostfr"], "embed": "https://vidzy.org/movie/…" }
 *   → { "available": false, "tmdb_id": 964284 }
 *
 * Rules (nothing else, no guessing):
 *  - VIDZY has the title only if the API answers "available": true,
 *    with the right type (movie for a movie, a series type for a series)
 *    and at least one French language (vf / vostfr);
 *  - "available": false (or 404) → VIDZY doesn't have it;
 *  - no valid answer (timeout, error, not JSON) → unknown; VIDZY is then
 *    NOT offered (only a confirmed "available": true shows VIDZY).
 */
export type FrLang = "vf" | "vostfr";
interface VidzyAnswer {
  /** true = VIDZY has it · false = it doesn't · null = no valid answer from the API. */
  available: boolean | null;
  /** French languages VIDZY has, in VIDZY's order. */
  langs: FrLang[];
}

const BASE = (process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org").replace(/\/+$/, "");
const FR: FrLang[] = ["vf", "vostfr"];
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; LuminaFlix/1.0; +https://www.lumina-flix.live)",
};

interface ApiAnswer {
  available?: unknown;
  detectedType?: unknown;
  languages?: unknown;
}

/** One request; null when there's no valid JSON answer. */
async function request(tmdbId: string): Promise<ApiAnswer | "not-found" | null> {
  try {
    const res = await fetch(`${BASE}/api/${encodeURIComponent(tmdbId)}`, {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return "not-found";
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data && typeof data === "object" ? (data as ApiAnswer) : null;
  } catch {
    return null;
  }
}

export async function checkVidzy(tmdbId: string, isMovie: boolean): Promise<VidzyAnswer> {
  let data = await request(tmdbId);
  if (data === null) {
    // No valid answer: one more try after a short pause.
    await new Promise((resolve) => setTimeout(resolve, 600));
    data = await request(tmdbId);
  }
  if (data === null) return { available: null, langs: [] };
  if (data === "not-found" || data.available !== true) return { available: false, langs: [] };

  const type = typeof data.detectedType === "string" ? data.detectedType.toLowerCase() : "";
  // A TMDB id can be a movie and a series at the same time: the type must match.
  if (type && (isMovie ? type !== "movie" : type === "movie")) return { available: false, langs: [] };

  const languages = Array.isArray(data.languages) ? data.languages.map((l) => String(l).toLowerCase()) : [];
  const langs = FR.filter((l) => languages.includes(l)).sort((a, b) => languages.indexOf(a) - languages.indexOf(b));
  return langs.length ? { available: true, langs } : { available: false, langs: [] };
}
