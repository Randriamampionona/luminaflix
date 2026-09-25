"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Activity, Cpu, Languages, Maximize, Minimize, Play } from "lucide-react";
import DirectLuminaLinker from "@/components/direct-lumina-linker";
import GuardProtocol from "@/components/guard-protocol";
import SignalMonitor from "@/components/signal-monitor";
import { tmdbImage } from "@/lib/media";
import type { MediaInteraction } from "@/lib/media-interactions";
import PlayerActions from "./actions/player-actions";
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
export default function StreamPlayer({
  kind,
  mediaId,
  imdbId,
  season,
  episode,
  backdropPath,
  posterPath,
  title,
  interaction,
}: StreamPlayerProps) {
  const t = useTranslations("player");
  const groups = PLAYER_CONFIG[kind];
  const isEpisode = kind !== "movie";

  const [groupKey, setGroupKey] = useState<ProviderGroup["key"]>(groups[0].key);
  const [sourceId, setSourceId] = useState<string>(groups[0].providers[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeGroup = groups.find((g) => g.key === groupKey) ?? groups[0];
  const activeSource: Provider =
    activeGroup.providers.find((p) => p.id === sourceId) ?? activeGroup.providers[0];

  const embedUrl = activeSource.url({ mediaId, imdbId, season, episode });
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

  const selectSource = useCallback((id: string) => {
    setSourceId(id);
    setIsFullscreen(false);
    setIsPlaying(false);
  }, []);

  const selectGroup = useCallback(
    (key: ProviderGroup["key"]) => {
      const group = groups.find((g) => g.key === key);
      if (!group) return;
      setGroupKey(key);
      selectSource(group.providers[0].id);
    },
    [groups, selectSource],
  );

  const languageLabel = t(`languages.${activeGroup.key}`);

  return (
    <GuardProtocol>
      <div className="w-full space-y-6 animate-in fade-in duration-700 sm:space-y-8">
        {groups.length > 1 && (
          <div className="flex items-center justify-between gap-6">
            <div
              role="tablist"
              aria-label={t("servers")}
              className="flex max-w-full items-center gap-1.5 rounded-2xl border border-white/5 bg-zinc-900/40 p-1.5 backdrop-blur-md"
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
                      "cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-500 sm:px-8 sm:text-[11px] sm:tracking-widest",
                      selected
                        ? index === 0
                          ? "bg-white text-black"
                          : "bg-cyan-500 text-black"
                        : "text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {group.key === "all" ? t("languages.all") : t(`tabs.${group.key}`)}
                  </button>
                );
              })}
            </div>
            <div className="hidden items-center rounded-2xl border border-white/5 bg-zinc-900/20 px-6 py-3 md:flex">
              <Activity className="h-4 w-4 animate-pulse text-cyan-500" />
            </div>
          </div>
        )}

        <SignalMonitor />

        <div className="flex flex-col items-end space-y-2">
          <div
            className={cn(
              "overflow-hidden border border-white/10 bg-black shadow-2xl ring-1 ring-white/5 transition-all duration-500",
              isFullscreen
                ? "fixed inset-0 z-9999 m-0 h-screen w-screen p-0 portrait:top-1/2 portrait:left-1/2 portrait:h-[100vw] portrait:w-[100vh] portrait:origin-center portrait:-translate-x-1/2 portrait:-translate-y-1/2 portrait:rotate-90"
                : "relative aspect-video max-h-[73vh] w-full md:max-h-[77vh]",
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
                  <div className="absolute inset-0 bg-linear-to-tr from-zinc-950 via-zinc-900 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/60" />

                <div className="relative z-10 flex flex-col items-center space-y-5 px-4 text-center sm:space-y-6">
                  {title && (
                    <h2 className="max-w-xl text-xl font-black tracking-tight text-white drop-shadow-md md:text-3xl">
                      {title}
                    </h2>
                  )}
                  {isEpisode && season != null && episode != null && (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                      {t("episodeTag", { season, episode })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="group/btn relative flex cursor-pointer items-center gap-4 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all duration-300 hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] active:scale-95"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10">
                      <Play className="h-4 w-4 fill-black text-black transition-transform duration-300 group-hover/btn:scale-110" />
                    </span>
                    {isEpisode ? t("playEpisode") : t("play")}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
              className="group absolute top-2 right-2 z-150 flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-cyan-500/50 hover:bg-zinc-900/80 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] active:scale-95 md:gap-0 md:bg-zinc-950/60 md:px-3 md:hover:gap-3 md:hover:pr-5"
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                {isFullscreen ? (
                  <Minimize className="h-5 w-5 text-zinc-400 transition-all duration-300 group-hover:text-white" />
                ) : (
                  <Maximize className="h-5 w-5 text-zinc-400 transition-all duration-300 group-hover:text-cyan-400 md:group-hover:rotate-90" />
                )}
              </span>
              <span className="max-w-50 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 transition-all duration-500 ease-in-out md:max-w-0 md:text-zinc-400 md:group-hover:max-w-37.5 md:group-hover:text-cyan-400">
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

        <div role="radiogroup" aria-label={t("servers")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeGroup.providers.map((provider) => {
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
                  "relative flex cursor-pointer items-center gap-4 rounded-3xl border px-6 py-5 transition-all duration-500",
                  isActive ? "border-white bg-white" : "border-white/5 bg-zinc-900/40 hover:border-white/15",
                )}
              >
                <span className={cn("rounded-xl p-3", isActive ? "bg-black text-cyan-500" : "bg-white/5 text-zinc-500")}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col items-start text-left">
                  <span
                    className={cn(
                      "text-[11px] font-black uppercase tracking-widest",
                      isActive ? "text-black" : "text-white",
                    )}
                  >
                    {provider.name}
                  </span>
                  <span className={cn("text-[9px] font-bold uppercase", isActive ? "text-zinc-500" : "text-zinc-600")}>
                    {isActive ? t("active") : t("standby")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <DirectLuminaLinker embedUrl={embedUrl} title={title || `Lumina_${kind}_${mediaId}`} />

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-4xl border border-white/5 bg-zinc-950 px-6 py-5 shadow-2xl sm:px-8">
          <div className="flex items-center gap-3">
            <Cpu className="h-4 w-4 text-cyan-500/50" />
            <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400">
              {t("sourceId", { id: imdbId || mediaId })}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/5 px-4 py-2">
            <Languages className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
              {t("readyIn", { language: languageLabel })}
            </span>
          </div>
        </div>
      </div>
    </GuardProtocol>
  );
}
