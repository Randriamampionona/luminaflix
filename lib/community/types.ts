/**
 * Community uploads (videos shared by members, hosted on DoodStream).
 * Client-safe: types and small helpers only — Firestore access lives in
 * lib/community/server.ts, the DoodStream API in lib/community/doodstream.ts.
 */
export type CommunityCategory = "movie" | "kdrama" | "anime" | "tv";
export const COMMUNITY_CATEGORIES: CommunityCategory[] = ["movie", "kdrama", "anime", "tv"];
export type CommunityStatus = "pending" | "approved" | "rejected";

/** Genres offered in the upload form (keys, labels in locales "community.genres"). */
export const COMMUNITY_GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "documentary",
  "drama",
  "family",
  "fantasy",
  "history",
  "horror",
  "music",
  "mystery",
  "romance",
  "scifi",
  "thriller",
  "war",
  "western",
] as const;
export type CommunityGenre = (typeof COMMUNITY_GENRES)[number];

/** Original languages offered in the upload form (ISO 639-1, "other" last). */
export const COMMUNITY_LANGUAGES = ["fr", "mg", "en", "ko", "ja", "zh", "es", "hi", "ar", "other"] as const;

export interface CommunityVideo {
  /** "com_" + 7 digits, e.g. com_1560520 (also the Firestore document id). */
  id: string;
  category: CommunityCategory;
  /** Movie title — or, for an episode, its own (optional) title. */
  title: string;
  /** Series only: series name, season and episode. */
  seriesTitle: string | null;
  season: number | null;
  episode: number | null;
  description: string;
  year: number | null;
  genres: CommunityGenre[];
  language: string | null;
  cast: string | null;
  /** External poster URL (when the uploader gave a link). */
  posterUrl: string | null;
  /** A poster image was uploaded (served by /api/community/poster/[id]). */
  hasPoster: boolean;
  /** DoodStream file */
  doodFileCode: string;
  doodEmbedUrl: string;
  doodThumbnail: string | null;
  durationSec: number | null;
  status: CommunityStatus;
  /** Tagged 18+ by an admin. */
  adult: boolean;
  uploaderId: string;
  uploaderName: string;
  createdAt: string;
  reviewedAt: string | null;
}

export const isCommunityId = (id: string) => /^com_\d{5,10}$/.test(id);

/** Poster to show: uploaded image, else the given URL, else DoodStream's thumbnail. */
export function communityPoster(video: Pick<CommunityVideo, "id" | "hasPoster" | "posterUrl" | "doodThumbnail">) {
  if (video.hasPoster) return `/api/community/poster/${video.id}`;
  return video.posterUrl || video.doodThumbnail || null;
}

/** Player route of an upload, by category (the 4 existing player routes). */
export function communityWatchHref(video: Pick<CommunityVideo, "id" | "category">) {
  switch (video.category) {
    case "kdrama":
      return `/k-drama/play/${video.id}`;
    case "anime":
      return `/anime/play/${video.id}`;
    case "tv":
      return `/tv-shows/play/${video.id}`;
    default:
      return `/movies/${video.id}`;
  }
}

export const isEpisodic = (category: CommunityCategory) => category !== "movie";

/** "The Body · S1 E6" for episodes (plus the episode title when given), the title for movies. */
export function communityDisplayTitle(
  video: Pick<CommunityVideo, "category" | "title" | "seriesTitle" | "season" | "episode">,
) {
  if (!isEpisodic(video.category) || !video.seriesTitle) return video.title;
  const tag = `S${video.season ?? 1} E${video.episode ?? 1}`;
  return video.title ? `${video.seriesTitle} · ${tag} · ${video.title}` : `${video.seriesTitle} · ${tag}`;
}

/** Only what a card needs (keeps descriptions and uploader ids out of client props). */
export function toCardVideo(v: CommunityVideo) {
  return {
    id: v.id,
    category: v.category,
    title: v.title,
    seriesTitle: v.seriesTitle,
    season: v.season,
    episode: v.episode,
    year: v.year,
    language: v.language,
    hasPoster: v.hasPoster,
    posterUrl: v.posterUrl,
    doodThumbnail: v.doodThumbnail,
    adult: v.adult,
    uploaderName: v.uploaderName,
  };
}
