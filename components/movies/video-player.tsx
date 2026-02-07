"use client";

import { useState } from "react";
import {
  Tv2,
  Globe2,
  Zap,
  Play,
  Loader2,
  ShieldCheck,
  Languages,
  X,
  Maximize2,
  FastForward,
  CloudLightning,
  Layers,
  Activity,
  Cpu,
} from "lucide-react";
import SignalMonitor from "../signal-monitor";

interface Provider {
  name: string;
  id: string;
  url: (movieId: string, imdbId?: string) => string;
  icon: any;
  isExternal?: boolean;
}

const FR_PROVIDERS: Provider[] = [
  {
    name: "FrenchCloud (Ultra)",
    id: "frenchcloud",
    url: (_, imdbId) => `https://frenchcloud.cam/movie/${imdbId}`,
    icon: CloudLightning,
    isExternal: true,
  },
  {
    name: "Lumina 4K (Stream)",
    id: "4khub",
    url: (id) => `https://4khdhub.store/watch/${id}`,
    icon: Layers,
    isExternal: true,
  },
  {
    name: "Lumina Best (Legacy)",
    id: "frembed",
    url: (id) => `https://play.frembed.best/api/film.php?id=${id}`,
    icon: Tv2,
    isExternal: true,
  },
];

const EN_PROVIDERS: Provider[] = [
  {
    name: "VidFast (Flash)",
    id: "vidfast",
    url: (id) => `https://vidfast.pro/movie/${id}?autoPlay=true`,
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
    url: (id) => `https://vidsrc.to/embed/movie/${id}`,
    icon: Zap,
  },
];

export default function VideoPlayer({
  movieId,
  imdbId,
}: {
  movieId: string;
  imdbId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"FR" | "EN">("FR");
  const [activeSource, setActiveSource] = useState<Provider>(FR_PROVIDERS[0]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTheater, setShowTheater] = useState(false);

  const handleSourceChange = (source: Provider) => {
    setActiveSource(source);
    setIsUnlocked(false);
    setIsLoading(true);
    setShowTheater(false);
  };

  const handleTabChange = (tab: "FR" | "EN") => {
    setActiveTab(tab);
    const firstSource = tab === "FR" ? FR_PROVIDERS[0] : EN_PROVIDERS[0];
    handleSourceChange(firstSource);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-1000">
      {/* 1. TOP CONTROL BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-inner">
          <button
            onClick={() => handleTabChange("FR")}
            className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
              activeTab === "FR"
                ? "bg-white text-black shadow-[0_10px_20px_rgba(255,255,255,0.1)] scale-100"
                : "text-zinc-500 hover:text-zinc-300 scale-95"
            }`}
          >
            FR Channel
          </button>
          <button
            onClick={() => handleTabChange("EN")}
            className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
              activeTab === "EN"
                ? "bg-cyan-500 text-black shadow-[0_10px_20px_rgba(6,182,212,0.2)]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            EN Channel
          </button>
        </div>

        <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-zinc-900/20 rounded-2xl border border-white/5">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em]">
              Signal Strength
            </span>
            <span className="text-[10px] font-medium text-zinc-400">
              Stable Connection
            </span>
          </div>
          <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
        </div>
      </div>

      <SignalMonitor />

      {/* 2. MAIN CINEMA VIEWPORT */}
      <div className="relative aspect-video w-full overflow-hidden bg-black border border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,1)] ring-1 ring-white/5 group">
        {/* THEATER MODE OVERLAY */}
        {showTheater && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between px-6 py-3 bg-zinc-950/90 backdrop-blur-2xl border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70">
                  Lumina Virtual Terminal — {activeSource.name}
                </span>
              </div>
              <button
                onClick={() => setShowTheater(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <iframe
                src={activeSource.url(movieId, imdbId)}
                className="w-full h-full grayscale-[0.1] contrast-[1.1]"
                allowFullScreen
                allow="autoplay; encrypted-media"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          </div>
        )}

        {/* NATIVE PLAYER */}
        {isUnlocked && !activeSource.isExternal && (
          <div className="absolute inset-0 z-10">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                  <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" />
                </div>
              </div>
            )}
            <iframe
              src={activeSource.url(movieId, imdbId)}
              className="w-full h-full"
              allowFullScreen
              frameBorder="0"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )}

        {/* BRIDGE/TUNNEL STATE */}
        {isUnlocked && activeSource.isExternal && !showTheater && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 px-6">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="text-center space-y-8 relative z-10">
              <div className="hidden relative w-24 h-24 mx-auto bg-black border border-white/10 rounded-3xl rotate-12 md:flex items-center justify-center group-hover:rotate-0 transition-transform duration-700">
                <ShieldCheck className="w-10 h-10 text-cyan-500" />
                <div className="absolute -inset-2 border border-cyan-500/20 rounded-3xl animate-ping" />
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase text-white tracking-tighter italic">
                  Bypass Protocol Ready
                </h3>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold max-w-70 mx-auto leading-relaxed">
                  Decrypted source found via{" "}
                  <span className="text-cyan-500">{activeSource.name}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setIsLoading(true);
                  setShowTheater(true);
                }}
                className="group/btn relative px-12 py-4 bg-white text-black font-black rounded-2xl transition-all hover:bg-cyan-500 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="flex items-center gap-3 relative z-10 uppercase text-xs tracking-widest text-nowrap">
                  Start Virtual Stream <Maximize2 className="w-4 h-4" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* INITIAL UNLOCK SPLASH */}
        {!isUnlocked && (
          <div
            onClick={() => setIsUnlocked(true)}
            className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black transition-all duration-1000 group/unlock"
          >
            <div className="absolute inset-0 bg-linear-to-t from-cyan-950/20 to-transparent" />
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-cyan-500/30 scale-150 animate-pulse" />
              <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.4)] group-hover/unlock:scale-110 transition-all duration-700">
                <Play className="w-7 h-7 md:w-12 md:h-12 text-black fill-current" />
              </div>
            </div>
            <p className="hidden md:block mt-8 md:mt-12 text-[12px] font-black uppercase italic tracking-[0.5em] text-white/80 group-hover/unlock:text-cyan-400 transition-colors">
              Initialize Lumina <span className="text-cyan-500">Theater</span>
            </p>
          </div>
        )}
      </div>

      {/* 3. PROVIDER SELECTION ENGINE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === "FR" ? FR_PROVIDERS : EN_PROVIDERS).map((provider) => {
          const Icon = provider.icon;
          const isActive = activeSource.id === provider.id;
          return (
            <button
              key={provider.id}
              onClick={() => handleSourceChange(provider)}
              className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 border group ${
                isActive
                  ? "bg-white border-white shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)]"
                  : "bg-zinc-900/40 border-white/5 hover:border-white/20"
              }`}
            >
              <div
                className={`p-3 rounded-xl transition-colors duration-500 ${
                  isActive
                    ? "bg-black text-cyan-500"
                    : "bg-white/5 text-zinc-500 group-hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${isActive ? "text-black" : "text-white"}`}
                >
                  {provider.name}
                </span>
                <span
                  className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-500" : "text-zinc-600"}`}
                >
                  {provider.isExternal ? "Tunnel Access" : "Native Player"}
                </span>
              </div>
              {isActive && (
                <div className="absolute right-6 w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. SYSTEM STATUS FOOTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-cyan-500/50" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                Active Core
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                Lumina {activeTab}-X5
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/5 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
              Metadata Hash
            </span>
            <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-tighter">
              {imdbId || movieId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
          <Languages className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            Ready in {activeTab === "FR" ? "French" : "English"}
          </span>
        </div>
      </div>
    </div>
  );
}
