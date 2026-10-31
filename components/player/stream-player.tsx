"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrembedAvailability } from "@/hooks/use-frembed-availability";
import { recordActivity } from "@/action/user-stats.action";
import { markGoodMoment } from "@/lib/good-moments";
import { recordWatched } from "@/lib/watch-history";
import { reportServer } from "@/action/server-health.action";
import { rememberServer, useRememberedServer, useServerHealth } from "@/lib/server-health-client";
import { toast } from "sonner";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Activity, ArrowDown, Cpu, Languages, Maximize, Minimize, Play } from "lucide-react";
import DirectLuminaLinker from "@/components/direct-lumina-linker";
import ShareCard from "@/components/share/share-card";
import GuardProtocol from "@/components/guard-protocol";
import SignalMonitor from "@/components/signal-monitor";
import { tmdbImage } from "@/lib/media";
import type { MediaInteraction } from "@/lib/media-interactions";
import PlayerActions from "./actions/player-actions";
import AdsNoticeModal from "./ads-notice-modal";
import FrUnavailableBanner from "./fr-unavailable-banner";
import { cn } from "@/lib/utils";
import { PLAYER_CONFIG, REACTION_TYPE, type PlayerKind, type Provider, type ProviderGroup } from "./providers";

interface StreamPlayerProps {
  kind: PlayerKind;
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  backdropPath?: string | null;
  posterPath?: string | null;
  title?: string;
  /** For the share card: short description, release year, TMDB rating, episode name. */
  overview?: string | null;
  releaseYear?: string | null;
  rating?: number | null;
  episodeName?: string | null;
  /** Like/dislike/favorite state, started on the server (not awaited). */
  interaction: Promise<MediaInteraction>;
}

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

function getOrientation(): LockableOrientation | undefined {
  return (typeof window !== "undefined" ? window.screen?.orientation : undefined) as
    | LockableOrientation
    | undefined;
}

/**
 * One player for movies, anime and K-dramas (replaces VideoPlayer,
 * AnimePlayer and DramaPlayer, which were ~95% duplicated). Sources come
 * from PLAYER_CONFIG and are unchanged.
 */
/** Route section of each player kind (share links). */
const SECTION: Record<PlayerKind, string> = { movie: "movies", anime: "anime", drama: "k-drama", tv: "tv-shows" };

export default function StreamPlayer({
  kind,
  mediaId,
  imdbId,
  season,
  episode,
  backdropPath,
  posterPath,
  title,
  overview,
  releaseYear,
  rating,
  episodeName,
  interaction,
}: StreamPlayerProps) {
  const t = useTranslations("player");
  const groups = PLAYER_CONFIG[kind];
  const isEpisode = kind !== "movie";

  /** Tab picked by the user; null = the tab of the server that worked last time, else the first. */
  const [groupKey, setGroupKey] = useState<ProviderGroup["key"] | null>(null);
  // Server health: the server that worked last time for this title comes first,
  // then servers ranked by visitors' reports (lib/server-health-client.ts).
  const remembered = useRememberedServer(kind, mediaId);
  const health = useServerHealth(kind, mediaId);
  /** Server picked by the user; null = automatic (first server, or the French one that has the title). */
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback started: history ("Because you watched…"), badges, and after
  // 12 minutes of watching a "good moment" to offer the app / an account.
  useEffect(() => {
    if (!isPlaying) return;
    const mediaKind = ({ movie: "movie", anime: "anime", drama: "kdrama", tv: "tv" } as const)[kind];
    recordWatched({ id: Number(mediaId), kind: mediaKind, title: title || "" });
    try {
      const key = `lf_watched_${mediaKind}_${mediaId}_${new Date().toISOString().slice(0, 10)}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        void recordActivity("watch", mediaKind).catch(() => {});
      }
    } catch {
      // storage blocked
    }
    let watchedMs = 0;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") watchedMs += 30_000;
      if (watchedMs >= 12 * 60_000) {
        markGoodMoment("watched");
        clearInterval(tick);
      }
    }, 30_000);
    return () => clearInterval(tick);
  }, [isPlaying, kind, mediaId, title]);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  /** "Download directly" (VIDZY): a hint points at the player's own download button for a few seconds. */
  const [downloadHint, setDownloadHint] = useState(false);
  useEffect(() => {
    if (!downloadHint) return;
    const timer = setTimeout(() => setDownloadHint(false), 9000);
    return () => clearTimeout(timer);
  }, [downloadHint]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rememberedGroup = groups.find((g) => g.providers.some((p) => p.id === remembered))?.key;
  const activeGroup = groups.find((g) => g.key === (groupKey ?? rememberedGroup)) ?? groups[0];

  // French tab: check silently which French player has this title / episode —
  // VIDZY first (one server per language it has: VF, VOSTFR), then Frembed —
  // otherwise offer (then switch to) an English server.
  const isFrenchTab = activeGroup.key === "fr" || activeGroup.key === "vf";
  const availability = useFrembedAvailability({ kind, mediaId, imdbId, season, episode, enabled: isFrenchTab });
  const checked = availability.status === "available" || availability.status === "unavailable";
  // Once checked, only the VIDZY languages that exist are listed (VF, VOSTFR or both).
  const providers = (
    isFrenchTab && checked
      ? activeGroup.providers.filter(
          (p) => !p.id.startsWith("vidzy_") || availability.langs.includes(p.id.slice(6) as "vf" | "vostfr"),
        )
      : activeGroup.providers
  )
    .map((p, index) => ({ p, index, rank: (p.id === remembered ? 100 : 0) + health.rank(p.id) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map(({ p }) => p);
  const firstOf = (prefix: string) => providers.find((p) => p.id.startsWith(prefix))?.id;
  const autoSourceId =
    (isFrenchTab && availability.provider === "vidzy" && availability.langs[0] && `vidzy_${availability.langs[0]}`) ||
    (isFrenchTab && availability.provider === "frembed" && firstOf("frembed")) ||
    // Neither has it: the first French server that isn't VIDZY (the notice offers English).
    (isFrenchTab && availability.status === "unavailable" && (firstOf("frembed") ?? providers[0]?.id)) ||
    providers[0]?.id ||
    activeGroup.providers[0].id;
  // A manual pick that's no longer listed (e.g. VOSTFR not available) falls back to the automatic choice.
  const activeSource: Provider =
    providers.find((p) => p.id === sourceId) ??
    providers.find((p) => p.id === remembered) ??
    providers.find((p) => p.id === autoSourceId) ??
    activeGroup.providers[0];

  // VIDZY sometimes files a series season as one "movie" entry: then its own link is used.
  const embedUrl =
    activeSource.id.startsWith("vidzy_") && availability.embed
      ? `${availability.embed}/${activeSource.id.slice(6)}`
      : activeSource.url({ mediaId, imdbId, season, episode });

  useEffect(() => {
    if (!isPlaying) return;
    let visibleMs = 0;
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") visibleMs += 15_000;
      if (visibleMs >= 3 * 60_000) {
        clearInterval(tick);
        rememberServer(kind, mediaId, activeSource.id);
        void reportServer(kind, mediaId, activeSource.id, true).catch(() => {});
      }
    }, 15_000);
    return () => clearInterval(tick);
  }, [isPlaying, kind, mediaId, activeSource.id]);

  const splash = tmdbImage(backdropPath || posterPath);

  // Custom fullscreen: lock scroll + orientation, Escape exits, always restore.
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const orientation = getOrientation();
    orientation?.lock?.("landscape").catch(() => {});

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      try {
        orientation?.unlock?.();
      } catch {
        // Not supported outside fullscreen on some browsers.
      }
    };
  }, [isFullscreen]);

  const selectSource = useCallback((id: string | null) => {
    setSourceId(id);
    setIsFullscreen(false);
    setIsPlaying(false);
  }, []);

  const selectGroup = useCallback(
    (key: ProviderGroup["key"]) => {
      const group = groups.find((g) => g.key === key);
      if (!group) return;
      setGroupKey(key);
      selectSource(null); // automatic choice in that tab
    },
    [groups, selectSource],
  );

  /** "Not working?": report it, forget it, and switch to the next server of the tab. */
  const reportBroken = () => {
    void reportServer(kind, mediaId, activeSource.id, false).catch(() => {});
    if (remembered === activeSource.id) rememberServer(kind, mediaId, "");
    const next = providers[(providers.findIndex((p) => p.id === activeSource.id) + 1) % providers.length];
    toast.success(t("reportThanks"), {
      description: next && next.id !== activeSource.id ? t("reportSwitched", { server: next.name }) : undefined,
    });
    if (next && next.id !== activeSource.id) selectSource(next.id);
  };

  const onFrenchPlayer = isFrenchTab && (activeSource.id.startsWith("vidzy_") || activeSource.id.startsWith("frembed"));
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const englishGroup = groups.find((g) => g.key === "en" || g.key === "vo");
  const contentKey = `${kind}-${mediaId}-${season ?? ""}-${episode ?? ""}`;
  const showFrUnavailable =
    onFrenchPlayer && availability.status === "unavailable" && !!englishGroup && dismissedFor !== contentKey;

  const switchToEnglish = useCallback(() => {
    if (!englishGroup) return;
    const wasPlaying = isPlaying;
    selectGroup(englishGroup.key);
    // Already pressed play on the empty FR player: start the English one right away.
    if (wasPlaying) setIsPlaying(true);
  }, [englishGroup, isPlaying, selectGroup]);

  const languageLabel = t(`languages.${activeGroup.key}`);

  return (
    <GuardProtocol>
      <div className="w-full space-y-6 animate-in fade-in duration-700 sm:space-y-8">
        {groups.length > 1 && (
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            <div
              role="tablist"
              aria-label={t("servers")}
              className="flex w-full items-center gap-1 rounded-2xl border border-line bg-elevated/40 p-1 backdrop-blur-md sm:w-auto sm:gap-1.5 sm:p-1.5"
            >
              {groups.map((group, index) => {
                const selected = group.key === activeGroup.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectGroup(group.key)}
                    className={cn(
                      "flex-1 cursor-pointer whitespace-nowrap rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:flex-none sm:px-8 sm:text-[11px] sm:tracking-widest",
                      selected
                        ? index === 0
                          ? "bg-inverse text-inverse-fg"
                          : "bg-cyan-500 text-black"
                        : "text-fg-subtle hover:text-fg-soft",
                    )}
                  >
                    {group.key === "all" ? t("languages.all") : t(`tabs.${group.key}`)}
                  </button>
                );
              })}
            </div>
            <div className="hidden items-center rounded-2xl border border-line bg-elevated/20 px-6 py-3 md:flex">
              <Activity className="h-4 w-4 animate-pulse text-brand" />
            </div>
          </div>
        )}

        <SignalMonitor />

        <div className="flex flex-col items-end space-y-2">
          <div
            ref={playerBoxRef}
            className={cn(
              // Always dark: artwork, video and overlay controls.
              "dark overflow-hidden border border-line-strong bg-background text-foreground shadow-2xl ring-1 ring-line transition-all duration-500",
              isFullscreen
                ? "fixed inset-0 z-9999 m-0 h-screen w-screen p-0 portrait:top-1/2 portrait:left-1/2 portrait:h-[100vw] portrait:w-[100vh] portrait:origin-center portrait:-translate-x-1/2 portrait:-translate-y-1/2 portrait:rotate-90"
                : "relative aspect-video max-h-[73vh] w-full rounded-2xl sm:rounded-3xl md:max-h-[77vh]",
            )}
          >
            {isPlaying ? (
              <iframe
                key={embedUrl}
                src={embedUrl}
                title={t("iframeTitle", { title: title || activeSource.name })}
                className="h-full w-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen"
                referrerPolicy="origin"
              />
            ) : (
              <div className="group relative flex h-full w-full items-center justify-center overflow-hidden">
                {splash ? (
                  <Image
                    src={splash}
                    alt=""
                    fill
                    priority
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-tr from-surface via-elevated to-surface" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/60" />

                <div className="relative z-10 flex flex-col items-center space-y-3 px-4 text-center sm:space-y-6">
                  {title && (
                    <h2 className="line-clamp-2 max-w-xl text-lg font-black tracking-tight text-foreground drop-shadow-md sm:text-xl md:text-3xl">
                      {title}
                    </h2>
                  )}
                  {isEpisode && season != null && episode != null && (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-brand-bright sm:px-4 sm:py-1.5">
                      {t("episodeTag", { season, episode })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="group/btn relative flex cursor-pointer items-center gap-3 rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-black shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all duration-300 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] active:scale-95 sm:gap-4 sm:px-8 sm:py-4 sm:text-xs"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 sm:h-8 sm:w-8">
                      <Play className="h-4 w-4 fill-black text-black transition-transform duration-300 group-hover/btn:scale-110" />
                    </span>
                    {isEpisode ? t("playEpisode") : t("play")}
                  </button>
                </div>
              </div>
            )}

            {/* VIDZY "Download directly": points at the player's "Télécharger" button (bottom-right bar). */}
            {downloadHint && activeSource.id.startsWith("vidzy_") && (
              <div
                aria-hidden
                className="pointer-events-none absolute right-[11%] bottom-16 z-20 flex flex-col items-center gap-1 animate-in fade-in slide-in-from-top-2 duration-500 sm:bottom-20"
              >
                <span className="rounded-full bg-cyan-500 px-3 py-1.5 text-[10px] font-black tracking-widest whitespace-nowrap text-black uppercase shadow-[0_8px_30px_rgba(6,182,212,0.8)]">
                  {t("downloadHint")}
                </span>
                <ArrowDown
                  className="h-7 w-7 animate-bounce text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]"
                  strokeWidth={3}
                />
              </div>
            )}

            {showFrUnavailable && (
              <FrUnavailableBanner
                key={contentKey}
                kind={kind}
                onSwitch={switchToEnglish}
                onDismiss={() => setDismissedFor(contentKey)}
              />
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="group absolute top-2 right-2 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface/70 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-cyan-500/50 hover:bg-elevated/80 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] active:scale-95 sm:top-3 sm:right-3 md:h-auto md:w-auto md:justify-start md:gap-0 md:rounded-2xl md:bg-surface/60 md:px-3 md:py-3 md:hover:gap-3 md:hover:pr-5"
            >
              <span className="relative flex h-5 w-5 items-center justify-center md:h-6 md:w-6">
                {isFullscreen ? (
                  <Minimize className="h-5 w-5 text-fg-muted transition-all duration-300 group-hover:text-foreground" />
                ) : (
                  <Maximize className="h-5 w-5 text-fg-muted transition-all duration-300 group-hover:text-brand-bright md:group-hover:rotate-90" />
                )}
              </span>
              {/* Label only on desktop (on hover); icon only on phones. */}
              <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-fg-muted transition-all duration-500 ease-in-out md:inline-block md:group-hover:max-w-37.5 md:group-hover:text-brand-bright">
                {isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              </span>
            </button>
          </div>

          <PlayerActions
            key={`${kind}-${mediaId}-${season ?? ""}-${episode ?? ""}`}
            mediaRef={{ mediaId, type: REACTION_TYPE[kind], season, episode }}
            interaction={interaction}
          />
        </div>

        <div
          role="radiogroup"
          aria-label={t("servers")}
          className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          {providers.map((provider) => {
            const Icon = provider.icon;
            const isActive = activeSource.id === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => selectSource(provider.id)}
                className={cn(
                  "relative flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-500 sm:gap-4 sm:rounded-3xl sm:px-6 sm:py-5",
                  isActive ? "border-inverse bg-inverse" : "border-line bg-elevated/40 hover:border-line-stronger",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-xl p-2.5 sm:p-3",
                    isActive ? "bg-inverse-fg text-brand" : "bg-tint text-fg-subtle",
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                {health.health(provider.id) && (
                  <span
                    title={health.health(provider.id) === "good" ? t("healthGood") : t("healthBad")}
                    className={cn(
                      "absolute top-2 right-2 h-2 w-2 rounded-full",
                      health.health(provider.id) === "good" ? "bg-emerald-500" : "bg-red-500",
                    )}
                  />
                )}
                <span className="flex min-w-0 flex-col items-start text-left">
                  <span
                    className={cn(
                      "w-full truncate text-[10px] font-black uppercase tracking-wider sm:text-[11px] sm:tracking-widest",
                      isActive ? "text-inverse-fg" : "text-foreground",
                    )}
                  >
                    {provider.name}
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase", isActive ? "text-fg-subtle" : "text-fg-faint")}>
                    {isActive ? t("active") : t("standby")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {isPlaying && providers.length > 1 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reportBroken}
              className="cursor-pointer rounded-xl px-3 py-2 text-[10px] font-black tracking-widest text-fg-subtle uppercase transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              {t("reportBroken")}
            </button>
          </div>
        )}

        {/* External players may open ad tabs: explain it once per visit. */}
        <AdsNoticeModal />

        <DirectLuminaLinker
          embedUrl={embedUrl}
          title={title || `Lumina_${kind}_${mediaId}`}
          // VIDZY has its own download button: offer it before 1DM.
          directDownload={activeSource.id.startsWith("vidzy_")}
          onDirectDownload={() => {
            setIsPlaying(true);
            setDownloadHint(true);
            playerBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        {/* Share the title currently playing */}
        <ShareCard
          info={{
            title: title || "LuminaFlix",
            kind,
            path:
              kind === "movie"
                ? `/movies/${mediaId}`
                : `/${SECTION[kind]}/play/${mediaId}?s=${season ?? 1}&e=${episode ?? 1}`,
            posterPath,
            overview,
            year: releaseYear,
            rating,
            episodeLabel: isEpisode
              ? `S${season ?? 1} · E${episode ?? 1}${episodeName ? ` — ${episodeName}` : ""}`
              : null,
            // Episodes: also give the series page (all seasons & episodes).
            seriesPath: isEpisode ? `/${SECTION[kind]}/${mediaId}` : null,
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-line bg-surface px-6 py-5 shadow-2xl sm:px-8">
          <div className="flex items-center gap-3">
            <Cpu className="h-4 w-4 text-brand/50" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-fg-muted">
              {t("sourceId", { id: imdbId || mediaId })}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-line bg-tint px-4 py-2">
            <Languages className="h-3.5 w-3.5 text-fg-subtle" />
            <span className="text-[9px] font-black uppercase tracking-widest text-fg-muted">
              {t("readyIn", { language: languageLabel })}
            </span>
          </div>
        </div>
      </div>
    </GuardProtocol>
  );
}
