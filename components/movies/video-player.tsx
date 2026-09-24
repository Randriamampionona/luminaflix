"use client";

import { useState, useEffect } from "react";
import {
  Tv2,
  Globe2,
  Zap,
  Languages,
  FastForward,
  Activity,
  Cpu,
  Maximize,
  Minimize,
  Play,
} from "lucide-react";
import SignalMonitor from "../signal-monitor";
import DirectLuminaLinker from "../direct-lumina-linker";
import StreamActionSuite from "../stream-action-suite";
import GuardProtocol from "../guard-protocol";

interface Provider {
  name: string;
  id: string;
  url: (movieId: string, imdbId?: string) => string;
  icon: any;
}

const FR_PROVIDERS: Provider[] = [
  {
    name: "Lumina frembed.surf TMBD",
    id: "frembed_surf_TMBD",
    url: (id) => `https://frembed.surf/embed/movie/${id}`,
    icon: Tv2,
  },
  {
    name: "Lumina frembed.surf IMDB",
    id: "frembed_surf_IMDB",
    url: (_, imdbId) => `https://frembed.surf/embed/movie/${imdbId}`,
    icon: Tv2,
  },
];

const EN_PROVIDERS: Provider[] = [
  {
    name: "videasy (Flash)",
    id: "videasy",
    url: (id) => `https://player.videasy.ws/embed/movie/${id}`,
    icon: FastForward,
  },
  {
    name: "VidFast (Flash)",
    id: "vidfast",
    url: (id) => `https://vidfast.vc/movie/${id}?autoPlay=true`,
    icon: FastForward,
  },
  {
    name: "VidLink (Direct)",
    id: "vidlink",
    url: (id) => `https://vidlink.pro/movie/${id}?primaryColor=06b6d4`,
    icon: Globe2,
  },
  {
    name: "VidSrc (Global)",
    id: "vidsrc",
    url: (id) => `https://vidsrc.sbs/embed/movie/${id}`,
    icon: Zap,
  },
];

export default function VideoPlayer({
  movieId,
  imdbId,
  backdropPath,
  posterPath,
  title,
}: {
  movieId: string;
  imdbId?: string;
  backdropPath?: string;
  posterPath?: string;
  title?: string;
}) {
  const [activeTab, setActiveTab] = useState<"FR" | "EN">("FR");
  const [activeSource, setActiveSource] = useState<Provider>(FR_PROVIDERS[0]);
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const backdropUrl = backdropPath
    ? `https://image.tmdb.org/t/p/original${backdropPath}`
    : posterPath
    ? `https://image.tmdb.org/t/p/original${posterPath}`
    : null;

  useEffect(() => {
    if (isCustomFullscreen) {
      document.body.style.overflow = "hidden";
      const orientation = (window.screen.orientation ||
        (window.screen as any).mozOrientation ||
        (window.screen as any).msOrientation) as any;

      if (orientation && orientation.lock) {
        orientation.lock("landscape").catch(() => {});
      }
    } else {
      document.body.style.overflow = "";
      const orientation = (window.screen.orientation ||
        (window.screen as any).mozOrientation ||
        (window.screen as any).msOrientation) as any;
      if (orientation && orientation.unlock) {
        orientation.unlock();
      }
    }
    // UI FIX: never leave the page scroll-locked when the player unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCustomFullscreen]);

  const handleSourceChange = (source: Provider) => {
    setActiveSource(source);
    setIsCustomFullscreen(false);
  };

  const handleTabChange = (tab: "FR" | "EN") => {
    setActiveTab(tab);
    handleSourceChange(tab === "FR" ? FR_PROVIDERS[0] : EN_PROVIDERS[0]);
  };

  return (
    <GuardProtocol>
      <div className="w-full space-y-8 animate-in fade-in duration-1000">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
          <div className="flex max-w-full items-center gap-1.5 p-1.5 bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl">
            {(["FR", "EN"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-4 sm:px-8 py-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest whitespace-nowrap transition-all duration-500 ${
                  activeTab === tab
                    ? tab === "FR"
                      ? "bg-white text-black"
                      : "bg-cyan-500 text-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab} Channel
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-zinc-900/20 rounded-2xl border border-white/5">
            <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
          </div>
        </div>

        <SignalMonitor />

        <div className="flex items-end flex-col space-y-2">
          <div
            className={`overflow-hidden bg-black border border-white/10 shadow-2xl ring-1 ring-white/5 transition-all duration-500 ${
              isCustomFullscreen
                ? "fixed inset-0 p-0 m-0 z-9999 w-screen h-screen portrait:w-[100vh] portrait:h-[100vw] portrait:rotate-90 portrait:origin-center portrait:top-1/2 portrait:left-1/2 portrait:-translate-x-1/2 portrait:-translate-y-1/2"
                : "relative aspect-video max-h-[73vh] md:max-h-[77vh] w-full"
            }`}
          >
            {/* DIRECT MEDIA EMBED OR SPLASH POSTER */}
            {isPlaying ? (
              <iframe
                src={activeSource.url(movieId, imdbId)}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
              />
            ) : (
              <div className="relative w-full h-full flex items-center justify-center group overflow-hidden">
                {backdropUrl ? (
                  <img
                    src={backdropUrl}
                    alt={title || "Poster"}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-tr from-zinc-950 via-zinc-900 to-zinc-950" />
                )}

                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-black/60" />

                <div className="relative z-10 flex flex-col items-center text-center px-4 space-y-6">
                  {title && (
                    <h2 className="text-xl md:text-3xl font-black text-white tracking-tight drop-shadow-md max-w-xl">
                      {title}
                    </h2>
                  )}

                  <button
                    onClick={() => setIsPlaying(true)}
                    className="group/btn relative flex items-center gap-4 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl transition-all duration-300 shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:shadow-[0_0_80px_rgba(6,182,212,0.8)] hover:scale-105 active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center">
                      <Play className="w-4 h-4 text-black fill-black transition-transform duration-300 group-hover/btn:scale-110" />
                    </div>
                    <span>Play Stream</span>
                  </button>
                </div>
              </div>
            )}

            {/* CUSTOM FULLSCREEN BUTTON */}
            <button
              onClick={() => setIsCustomFullscreen(!isCustomFullscreen)}
              className={`
                absolute top-2 right-2 z-150
                group flex items-center gap-3 md:gap-0 md:hover:gap-3
                px-4 py-3 md:px-3 md:py-3 rounded-2xl
                bg-zinc-950/80 md:bg-zinc-950/60 backdrop-blur-2xl
                border border-white/10
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                hover:border-cyan-500/50 hover:bg-zinc-900/80
                hover:shadow-[0_0_40px_rgba(6,182,212,0.25)]
                md:hover:pr-5
                active:scale-95
              `}
            >
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/5 md:bg-cyan-500/0 md:group-hover:bg-cyan-500/5 transition-colors duration-500" />

              <div className="relative flex items-center justify-center w-6 h-6">
                {isCustomFullscreen ? (
                  <Minimize className="w-5 h-5 text-zinc-400 group-hover:text-white transition-all duration-300" />
                ) : (
                  <>
                    <Maximize className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-all duration-300 md:group-hover:rotate-90" />
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
                  </>
                )}
              </div>

              <span
                className={`
                  overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]
                  text-cyan-400 md:text-zinc-400 md:group-hover:text-cyan-400
                  max-w-50 md:max-w-0 md:group-hover:max-w-37.5
                  transition-all duration-500 ease-in-out
                `}
              >
                {isCustomFullscreen ? "Exit Terminal" : "Go Fullscreen"}
              </span>

              <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-white/20 group-hover:border-cyan-500/50 transition-colors" />
            </button>
          </div>
          <StreamActionSuite type="MOVIE" mediaId={movieId} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(activeTab === "FR" ? FR_PROVIDERS : EN_PROVIDERS).map(
            (provider) => {
              const Icon = provider.icon;
              const isActive = activeSource.id === provider.id;
              return (
                <button
                  key={provider.id}
                  onClick={() => handleSourceChange(provider)}
                  className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 border ${
                    isActive
                      ? "bg-white border-white"
                      : "bg-zinc-900/40 border-white/5"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      isActive
                        ? "bg-black text-cyan-500"
                        : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span
                      className={`text-[11px] font-black uppercase tracking-widest ${
                        isActive ? "text-black" : "text-white"
                      }`}
                    >
                      {provider.name}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase ${
                        isActive ? "text-zinc-500" : "text-zinc-600"
                      }`}
                    >
                      Active Stream
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="flex justify-center">
          <DirectLuminaLinker
            embedUrl={activeSource.url(movieId, imdbId)}
            title={`Lumina_${activeTab}_${movieId}`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-cyan-500/50" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
              Lumina {activeTab}-X5 — {imdbId || movieId}
            </span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
            <Languages className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[9px] font-black uppercase text-zinc-400">
              Ready in {activeTab === "FR" ? "French" : "English"}
            </span>
          </div>
        </div>
      </div>
    </GuardProtocol>
  );
}