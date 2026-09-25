import { Activity, FastForward, Globe2, Layers, Tv2, Zap, type LucideIcon } from "lucide-react";

/**
 * Stream sources, moved verbatim from the former VideoPlayer / AnimePlayer /
 * DramaPlayer components (no source added, removed or changed).
 */
export interface StreamTarget {
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
}

export interface Provider {
  id: string;
  name: string;
  icon: LucideIcon;
  url: (target: StreamTarget) => string;
}

export interface ProviderGroup {
  /** Tab key → translations under `player.tabs` / `player.languages`. */
  key: "fr" | "en" | "vo" | "vf" | "all";
  providers: Provider[];
}

export type PlayerKind = "movie" | "anime" | "drama";

const s = (t: StreamTarget) => t.season ?? 1;
const e = (t: StreamTarget) => t.episode ?? 1;

export const PLAYER_CONFIG: Record<PlayerKind, ProviderGroup[]> = {
  movie: [
    {
      key: "fr",
      providers: [
        { name: "Lumina frembed.surf TMBD", id: "frembed_surf_TMBD", icon: Tv2, url: (t) => `https://frembed.surf/embed/movie/${t.mediaId}` },
        { name: "Lumina frembed.surf IMDB", id: "frembed_surf_IMDB", icon: Tv2, url: (t) => `https://frembed.surf/embed/movie/${t.imdbId}` },
      ],
    },
    {
      key: "en",
      providers: [
        { name: "videasy (Flash)", id: "videasy", icon: FastForward, url: (t) => `https://player.videasy.ws/embed/movie/${t.mediaId}` },
        { name: "VidFast (Flash)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/movie/${t.mediaId}?autoPlay=true` },
        { name: "VidLink (Direct)", id: "vidlink", icon: Globe2, url: (t) => `https://vidlink.pro/movie/${t.mediaId}?primaryColor=06b6d4` },
        { name: "VidSrc (Global)", id: "vidsrc", icon: Zap, url: (t) => `https://vidsrc.sbs/embed/movie/${t.mediaId}` },
      ],
    },
  ],
  anime: [
    {
      key: "vo",
      providers: [
        { name: "VidFast (Speed)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Alternative)", id: "videasy", icon: Activity, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "vidnest.fun (Alt)", id: "vidnest", icon: Globe2, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "111movies.com", id: "111movies", icon: Layers, url: (t) => `https://111movies.com/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidLink.pro", id: "vidlink", icon: Zap, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "vidsrc.sbs", id: "vidsrc", icon: Globe2, url: (t) => `https://vidsrc.sbs/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
    {
      key: "vf",
      providers: [
        { name: "Lumina Best (FR)", id: "frembed", icon: Tv2, url: (t) => `https://frembed.surf/api/serie.php?id=${t.mediaId}&sa=${s(t)}&epi=${e(t)}` },
      ],
    },
  ],
  drama: [
    {
      key: "all",
      providers: [
        { name: "VidLink (Direct)", id: "vidlink", icon: Zap, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "VidSrc (Global)", id: "vidsrc", icon: Globe2, url: (t) => `https://vidsrc.sbs/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidFast (Flash)", id: "vidfast", icon: FastForward, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Legacy)", id: "videasy", icon: Layers, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: Globe2, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
  ],
};

export const REACTION_TYPE: Record<PlayerKind, "MOVIE" | "ANIME" | "K_DRAMA"> = {
  movie: "MOVIE",
  anime: "ANIME",
  drama: "K_DRAMA",
};
