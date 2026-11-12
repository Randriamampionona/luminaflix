/**
 * French (VF / VOSTFR) availability of a title or episode — VIDZY first, then
 * Frembed. Used by the player (app/api/player/availability), the "French
 * only" listing filter (app/api/fr-availability) and the "Notify me" alerts.
 *
 * VIDZY: official API only (lib/vidzy.ts). Frembed: official API only
 * (lib/frembed.ts). Each server is offered only when its own API confirms the title.
 * Errors / timeouts count as "unknown", never as "not available". Zero cache:
 * every check asks both APIs live (8 s budget each, retries only after a real
 * "no"); answers as soon as VIDZY confirms. The player calls the two separately
 * (app/api/player/availability/vidzy and …/frembed).
 */
import "server-only";
import { checkFrembed } from "@/lib/frembed";
import { checkVidzy, type FrLang } from "@/lib/vidzy";

export type FrKind = "movie" | "anime" | "drama" | "tv";
type Check = { available: boolean | null; version: string | null };
type FrAvailabilityResult = Check & {
  /** French player that has the title: VIDZY (confirmed by its API) first, then Frembed. */
  provider: "vidzy" | "frembed" | null;
  /** VIDZY languages (only when VIDZY has it). */
  langs: FrLang[];
  lang: FrLang | null;
  /** VIDZY's API answer: true / false, or null when it gave no valid answer (VIDZY then not offered). */
  vidzy: boolean | null;
  /**
   * Frembed's API answers (null = no valid answer → not offered):
   * series → `frembed`; movies → `frembed` (by TMDB id) and `frembedImdb` (by IMDb id).
   */
  frembed: boolean | null;
  frembedImdb: boolean | null;
};

/**
 * Availability of a movie / episode (s, e ignored for movies), asked LIVE to
 * VIDZY's and Frembed's APIs on every call — no cache anywhere (server, CDN,
 * browser): what the app shows is always what the APIs answer right now.
 */
export async function checkFrAvailability(
  kind: FrKind,
  id: string,
  options: { imdb?: string; season?: number; episode?: number; attempts?: number } = {},
): Promise<FrAvailabilityResult> {
  const { imdb = "", season = 1, episode = 1, attempts = 4 } = options;
  return checkNow(kind, id, { imdb, season, episode, attempts });
}

async function checkNow(
  kind: FrKind,
  id: string,
  {
    imdb = "",
    season = 1,
    episode = 1,
    attempts = 4,
  }: { imdb?: string; season?: number; episode?: number; attempts?: number } = {},
): Promise<FrAvailabilityResult> {
  // Both APIs asked live and in parallel, each within an 8 s budget.
  const vidzyCheck = checkVidzy(id, kind === "movie", { attempts });
  const frembedCheck = checkFrembed(kind, id, { imdb, season, episode, attempts });

  // VIDZY has priority: as soon as it confirms, answer without waiting for Frembed.
  const vidzy = await vidzyCheck;
  if (vidzy.available) {
    return {
      available: true,
      provider: "vidzy",
      langs: vidzy.langs,
      lang: vidzy.langs[0],
      version: vidzy.langs.map((l) => l.toUpperCase()).join(" + "),
      vidzy: true,
      frembed: null,
      frembedImdb: null,
    };
  }
  const frembed = await frembedCheck;
  const both = { vidzy: vidzy.available, frembed: frembed.tmdb, frembedImdb: frembed.imdb };
  if (frembed.available) {
    return { available: true, provider: "frembed", langs: [], lang: null, version: frembed.version, ...both };
  }
  if (vidzy.available === false && frembed.available === false) {
    return { available: false, provider: null, langs: [], lang: null, version: null, ...both };
  }
  // One of the two gave no valid answer in time: don't claim "not available in French".
  return { available: null, provider: null, langs: [], lang: null, version: null, ...both };
}
