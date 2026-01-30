"use client";

import { useState } from "react";
import {
  Tv,
  Globe,
  Zap,
  Play,
  Loader2,
  ShieldCheck,
  Heart,
  Plus,
  HardDrive,
  Bookmark,
  Radio,
  LucideIcon,
} from "lucide-react";

interface Provider {
  name: string;
  id: string; // The missing ID
  url: (id: string) => string;
  icon: LucideIcon;
}

const PROVIDERS: Provider[] = [
  {
    name: "Lumina Vix",
    id: "vix",
    // We call our OWN API route now
    url: (id: string) =>
      `/api/proxy?url=${encodeURIComponent(`https://vixsrc.to/embed/movie/${id}?lang=fr`)}`,
    icon: Zap,
  },
  {
    name: "Lumina 4K",
    id: "4khub",
    url: (id: string) =>
      `/api/proxy?url=${encodeURIComponent(`https://4khdhub.store/watch/${id}`)}`,
    icon: Globe,
  },
];

export default function VideoPlayer({ movieId }: { movieId: string }) {
  const [activeSource, setActiveSource] = useState(PROVIDERS[0]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const handleSourceChange = (source: (typeof PROVIDERS)[0]) => {
    setActiveSource(source);
    setIsUnlocked(false);
    setIsLoading(true);
  };

  const toggleFavorite = () => {
    // No action for now, just visual toggle
    setIsFavorited(!isFavorited);
  };

  return (
    <div className="w-full space-y-6">
      {/* MAIN VIDEO TERMINAL */}
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl ring-1 ring-white/10 group">
        {!isUnlocked && (
          <div
            onClick={() => setIsUnlocked(true)}
            className="absolute inset-0 z-30 cursor-pointer flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl transition-all duration-700"
          >
            <div className="absolute top-8 flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-cyan-500/20">
              <ShieldCheck className="w-3 h-3 text-cyan-500" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                Lumina Cinema Mode
              </span>
            </div>

            <div className="relative group/btn">
              <div className="absolute -inset-6 bg-cyan-500/20 blur-3xl rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
              <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] group-hover/btn:scale-110 group-hover/btn:bg-cyan-500 transition-all duration-500">
                <Play className="w-10 h-10 text-black fill-current ml-1" />
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm font-black uppercase italic tracking-tighter text-white">
                Start Watching<span className="text-cyan-500">.</span>
              </p>
            </div>
          </div>
        )}

        {isLoading && isUnlocked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 animate-pulse">
                Initializing Buffer...
              </span>
            </div>
          </div>
        )}

        {isUnlocked && (
          <div className="relative aspect-video w-full rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <iframe
              // @ts-ignore
              is="x-frame-bypass"
              src={activeSource.url(movieId)}
              className="absolute inset-0 w-full h-full z-10"
              frameBorder="0"
              // Permissions ONLY in 'allow' (removes the allowfullscreen warning)
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              // 'no-referrer' is essential when using proxies to hide your ngrok origin
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoading(false)}
            />

            {/* Lumina Theme Branding overlay */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/30">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[10px] text-white font-black tracking-widest uppercase">
                  Lumina Bypass Active
                </span>
              </div>
            </div>

            <button
              onClick={() => window.open(activeSource.url(movieId), "_blank")}
              className="px-8 py-3 bg-white text-black font-bold rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:bg-cyan-400 transition-all"
            >
              Lancer le lecteur Lumina (Source {activeSource.name})
            </button>

            {isLoading && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950">
                <div className="relative w-24 h-24 mb-4">
                  <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white font-black tracking-widest text-[10px] uppercase">
                  Lumina Secure Link Established
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTROLS & FAVORITES */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-zinc-900/20 p-3 rounded-[2.5rem] border border-white/5">
        <div className="flex flex-wrap gap-2 flex-1">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isActive = activeSource.id === provider.id;

            return (
              <button
                key={provider.id}
                onClick={() => handleSourceChange(provider)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                  isActive
                    ? "bg-white border-white text-black shadow-xl"
                    : "bg-black/40 border-white/5 text-zinc-500 hover:text-white"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-cyan-600" : "text-zinc-500"}`}
                />
                {provider.name}
              </button>
            );
          })}
        </div>

        {/* PRO FAVORITE UNIT (SPLIT BUTTON) */}
        <div
          className={`transition-all duration-700 delay-300 flex items-center gap-1 ${
            isUnlocked && !isLoading
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-10 pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleFavorite}
              className={`group relative flex items-center gap-3 px-8 py-3 rounded-l-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl overflow-hidden ${
                isFavorited
                  ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-white text-black hover:bg-zinc-100"
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-all duration-300 ${
                  isFavorited ? "fill-black scale-110" : "group-hover:scale-110"
                }`}
              />
              <span>{isFavorited ? "In Collection" : "Add Favorite"}</span>
            </button>

            <button
              className="px-4 py-3 bg-zinc-800 text-white rounded-r-2xl hover:bg-zinc-700 transition-colors border-l border-black/20 group/save"
              title="Add to Watchlist"
            >
              <Bookmark className="w-4 h-4 group-hover/save:fill-white transition-all" />
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER STATUS BAR */}
      {isUnlocked && !isLoading && (
        <div className="flex items-center justify-between px-8 py-4 bg-zinc-900/10 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <HardDrive className="w-3 h-3 text-cyan-500" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                ID: {movieId}
              </span>
            </div>
            <div className="h-4 w-px bg-white/10 hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                Signal: Encrypted
              </span>
            </div>
          </div>
          <span className="text-[8px] font-black uppercase text-zinc-700 tracking-[0.4em]">
            Lumina Cinema v3.2
          </span>
        </div>
      )}
    </div>
  );
}
