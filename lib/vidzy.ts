/**
 * Reading VIDZY's API answer (https://vidzy.org/api/{tmdbId}) — shared by the
 * server check (lib/fr-availability.ts) and the browser check
 * (hooks/use-frembed-availability.ts).
 */
export type FrLang = "vf" | "vostfr";
const FR_LANGS: FrLang[] = ["vf", "vostfr"];

export const VIDZY_BASE = (process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org").replace(/\/+$/, "");

export interface VidzyResponse {
  available?: boolean;
  detectedType?: string;
  title?: string;
  embed?: string;
  languages?: unknown;
  seasons?: { season?: number; episodes?: number[] }[];
}

export interface VidzyCheck {
  /** true = VIDZY has it · false = VIDZY says no · null = couldn't ask VIDZY. */
  available: boolean | null;
  langs: FrLang[];
  /** VIDZY link to use instead of the usual one (series season filed as a "movie"). */
  embed: string | null;
}

const NO: VidzyCheck = { available: false, langs: [], embed: null };

/** `kind`: "movie" or a series kind. Season / episode are ignored for movies. */
export function readVidzy(
  data: VidzyResponse | "not-found",
  isMovie: boolean,
  season: number,
  episode: number,
): VidzyCheck {
  if (data === "not-found" || data.available !== true) return NO;

  // Same id can be a movie on TMDB and a series: only accept the right type —
  // except a series season that VIDZY files as a "movie" ("See - Saison 1"):
  // that one is played with VIDZY's own embed link, for the season it names.
  let embed: string | null = null;
  if (data.detectedType && data.detectedType !== (isMovie ? "movie" : "tv")) {
    const seasonMatch = /(?:saison|season)\s*(\d+)/i.exec(data.title ?? "");
    const ownEmbed = typeof data.embed === "string" && data.embed.startsWith(`${VIDZY_BASE}/`) ? data.embed : null;
    if (isMovie || data.detectedType !== "movie" || !seasonMatch || !ownEmbed) return NO;
    if (Number(seasonMatch[1]) !== season) return NO;
    embed = ownEmbed.replace(/\/+$/, "");
  }
  // Every French language, in VIDZY's own order (["vf", "vostfr"] → VF first, then VOSTFR).
  const languages = Array.isArray(data.languages) ? data.languages.map((l) => String(l).toLowerCase()) : [];
  const langs = FR_LANGS.filter((l) => languages.includes(l)).sort(
    (a, b) => languages.indexOf(a) - languages.indexOf(b),
  );
  if (!langs.length) return NO;
  if (!isMovie && !embed && Array.isArray(data.seasons)) {
    const s = data.seasons.find((x) => x.season === season);
    if (!s?.episodes?.includes(episode)) return NO;
  }
  return { available: true, langs, embed };
}
