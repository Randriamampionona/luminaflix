import {
  Boxes,
  Captions,
  Clapperboard,
  Crown,
  FastForward,
  Film,
  Globe2,
  Layers,
  Link2,
  MonitorPlay,
  Server,
  Sparkles,
  Star,
  Tv2,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Stream sources for the unified player (components/player/stream-player.tsx).
 * The FIRST group is French everywhere, starting with VIDZY: one server per
 * language (VF, VOSTFR) — the player only shows the languages VIDZY has.
 * app/api/player/availability checks in the background which French player
 * has the title (VIDZY first, then Frembed): the player opens VIDZY in the
 * right language, switches to Frembed if only Frembed has it, and offers an
 * English server if neither does.
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

export type PlayerKind = "movie" | "anime" | "drama" | "tv";

/**
 * Frembed's current domain (it changes when one gets blocked).
 * NEXT_PUBLIC_ so it also reaches the browser, where the player runs;
 * fixed at build time, so redeploy after changing it.
 */
const FREMBED = (process.env.NEXT_PUBLIC_FREMBED_BASE_URL || "https://frembed.bar").replace(/\/+$/, "");

/** VIDZY's domain (TMDB ids only). NEXT_PUBLIC_ for the same reason; redeploy after changing it. */
const VIDZY = (process.env.NEXT_PUBLIC_VIDZY_BASE_URL || "https://vidzy.org").replace(/\/+$/, "");

const s = (t: StreamTarget) => t.season ?? 1;
const e = (t: StreamTarget) => t.episode ?? 1;

/** One distinct icon per source, identical in every tab it appears in. */
const ICONS = {
  vidzyVf: Star,
  vidzyVostfr: Captions,
  frembedTmdb: Clapperboard,
  frembedImdb: Film,
  frembed: Tv2,
  videasy: Sparkles,
  vidfast: FastForward,
  vidlink: Link2,
  vidsrc: Zap,
  vidnest: Globe2,
  movies111: Layers,
  moviesapi: Server,
  embedmaster: Crown,
  twoEmbed: MonitorPlay,
  multiembed: Boxes,
} satisfies Record<string, LucideIcon>;

export const PLAYER_CONFIG: Record<PlayerKind, ProviderGroup[]> = {
  movie: [
    {
      key: "fr",
      providers: [
        { name: "Lumina VIDZY (VF)", id: "vidzy_vf", icon: ICONS.vidzyVf, url: (t) => `${VIDZY}/movie/${t.mediaId}/vf` },
        { name: "Lumina VIDZY (VOSTFR)", id: "vidzy_vostfr", icon: ICONS.vidzyVostfr, url: (t) => `${VIDZY}/movie/${t.mediaId}/vostfr` },
        { name: "Lumina frembed.bar TMBD", id: "frembed_surf_TMBD", icon: ICONS.frembedTmdb, url: (t) => `${FREMBED}/embed/movie/${t.mediaId}` },
        { name: "Lumina frembed.bar IMDB", id: "frembed_surf_IMDB", icon: ICONS.frembedImdb, url: (t) => `${FREMBED}/embed/movie/${t.imdbId}` },
      ],
    },
    {
      key: "en",
      providers: [
        { name: "videasy (Flash)", id: "videasy", icon: ICONS.videasy, url: (t) => `https://player.videasy.ws/embed/movie/${t.mediaId}` },
        { name: "VidFast (Flash)", id: "vidfast", icon: ICONS.vidfast, url: (t) => `https://vidfast.vc/movie/${t.mediaId}?autoPlay=true` },
        { name: "VidLink (Direct)", id: "vidlink", icon: ICONS.vidlink, url: (t) => `https://vidlink.pro/movie/${t.mediaId}?primaryColor=06b6d4` },
        { name: "VidSrc (Global)", id: "vidsrc", icon: ICONS.vidsrc, url: (t) => `https://vidsrc.to/embed/movie/${t.mediaId}` },
        { name: "MoviesAPI", id: "moviesapi", icon: ICONS.moviesapi, url: (t) => `https://moviesapi.to/movie/${t.mediaId}` },
        { name: "EmbedMaster", id: "embedmaster", icon: ICONS.embedmaster, url: (t) => `https://embedmaster.link/movie/${t.mediaId}` },
        { name: "2Embed", id: "2embed", icon: ICONS.twoEmbed, url: (t) => `https://www.2embed.online/embed/movie/${t.imdbId}` },
        { name: "MultiEmbed", id: "multiembed", icon: ICONS.multiembed, url: (t) => `https://multiembed.mov/?video_id=${t.imdbId}` },  // https://www.superembed.stream/?c=embed
      ],
    },
  ],
  anime: [
    {
      key: "vf",
      providers: [
        { name: "Lumina VIDZY (VF)", id: "vidzy_vf", icon: ICONS.vidzyVf, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vf` },
        { name: "Lumina VIDZY (VOSTFR)", id: "vidzy_vostfr", icon: ICONS.vidzyVostfr, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vostfr` },
        { name: "Lumina Best (FR)", id: "frembed", icon: ICONS.frembed, url: (t) => `${FREMBED}/embed/serie/${t.mediaId}?sa=${s(t)}&epi=${e(t)}` },
      ],
    },
    {
      key: "vo",
      providers: [
        { name: "VidFast (Speed)", id: "vidfast", icon: ICONS.vidfast, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Alternative)", id: "videasy", icon: ICONS.videasy, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "vidnest.fun (Alt)", id: "vidnest", icon: ICONS.vidnest, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "111movies.com", id: "111movies", icon: ICONS.movies111, url: (t) => `https://111movies.com/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidLink.pro", id: "vidlink", icon: ICONS.vidlink, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "vidsrc.to", id: "vidsrc", icon: ICONS.vidsrc, url: (t) => `https://vidsrc.to/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "MoviesAPI", id: "moviesapi", icon: ICONS.moviesapi, url: (t) => `https://moviesapi.to/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "EmbedMaster", id: "embedmaster", icon: ICONS.embedmaster, url: (t) => `https://embedmaster.link/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "2Embed", id: "2embed", icon: ICONS.twoEmbed, url: (t) => `https://www.2embed.online/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        // Series have no IMDb ID here: use the TMDB ID with MultiEmbed's `tmdb=1` + `s` / `e` params.
        { name: "MultiEmbed", id: "multiembed", icon: ICONS.multiembed, url: (t) => `https://multiembed.mov/?video_id=${t.mediaId}&tmdb=1&s=${s(t)}&e=${e(t)}` },
      ],
    },
  ],
  drama: [
    {
      key: "vf",
      providers: [
        { name: "Lumina VIDZY (VF)", id: "vidzy_vf", icon: ICONS.vidzyVf, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vf` },
        { name: "Lumina VIDZY (VOSTFR)", id: "vidzy_vostfr", icon: ICONS.vidzyVostfr, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vostfr` },
        { name: "Lumina Best (FR)", id: "frembed", icon: ICONS.frembed, url: (t) => `${FREMBED}/embed/serie/${t.mediaId}?sa=${s(t)}&epi=${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: ICONS.vidnest, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
    {
      key: "vo",
      providers: [
        { name: "VidSrc (Global)", id: "vidsrc", icon: ICONS.vidsrc, url: (t) => `https://vidsrc.to/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidLink (Direct)", id: "vidlink", icon: ICONS.vidlink, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "VidFast (Flash)", id: "vidfast", icon: ICONS.vidfast, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Legacy)", id: "videasy", icon: ICONS.videasy, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: ICONS.vidnest, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "MoviesAPI", id: "moviesapi", icon: ICONS.moviesapi, url: (t) => `https://moviesapi.to/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "EmbedMaster", id: "embedmaster", icon: ICONS.embedmaster, url: (t) => `https://embedmaster.link/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "2Embed", id: "2embed", icon: ICONS.twoEmbed, url: (t) => `https://www.2embed.online/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
  ],
  // TV shows (any country): same servers as K-dramas.
  tv: [
    {
      key: "vf",
      providers: [
        { name: "Lumina VIDZY (VF)", id: "vidzy_vf", icon: ICONS.vidzyVf, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vf` },
        { name: "Lumina VIDZY (VOSTFR)", id: "vidzy_vostfr", icon: ICONS.vidzyVostfr, url: (t) => `${VIDZY}/serie/${t.mediaId}/${s(t)}/${e(t)}/vostfr` },
        { name: "Lumina Best (FR)", id: "frembed", icon: ICONS.frembed, url: (t) => `${FREMBED}/embed/serie/${t.mediaId}?sa=${s(t)}&epi=${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: ICONS.vidnest, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
    {
      key: "vo",
      providers: [
        { name: "VidSrc (Global)", id: "vidsrc", icon: ICONS.vidsrc, url: (t) => `https://vidsrc.to/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidLink (Direct)", id: "vidlink", icon: ICONS.vidlink, url: (t) => `https://vidlink.pro/tv/${t.mediaId}/${s(t)}/${e(t)}?primaryColor=06b6d4` },
        { name: "VidFast (Flash)", id: "vidfast", icon: ICONS.vidfast, url: (t) => `https://vidfast.vc/tv/${t.mediaId}/${s(t)}/${e(t)}?autoPlay=true` },
        { name: "Videasy (Legacy)", id: "videasy", icon: ICONS.videasy, url: (t) => `https://player.videasy.ws/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "VidNest (Mirror)", id: "vidnest", icon: ICONS.vidnest, url: (t) => `https://vidnest.fun/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "MoviesAPI", id: "moviesapi", icon: ICONS.moviesapi, url: (t) => `https://moviesapi.to/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "EmbedMaster", id: "embedmaster", icon: ICONS.embedmaster, url: (t) => `https://embedmaster.link/tv/${t.mediaId}/${s(t)}/${e(t)}` },
        { name: "2Embed", id: "2embed", icon: ICONS.twoEmbed, url: (t) => `https://www.2embed.online/embed/tv/${t.mediaId}/${s(t)}/${e(t)}` },
      ],
    },
  ],
};

export const REACTION_TYPE: Record<PlayerKind, "MOVIE" | "ANIME" | "K_DRAMA" | "TV_SHOW"> = {
  movie: "MOVIE",
  anime: "ANIME",
  drama: "K_DRAMA",
  tv: "TV_SHOW",
};