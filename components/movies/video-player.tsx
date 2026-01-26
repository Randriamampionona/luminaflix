"use client";

import { useState } from "react";
import { Tv, Globe, Zap, Play, Loader2, ShieldCheck } from "lucide-react";

const PROVIDERS = [
  {
    name: "VidLink.pro",
    id: "vidlink",
    url: (id: string) => `https://vidlink.pro/movie/${id}?primaryColor=06b6d4`,
    icon: Globe,
  },
  {
    name: "VidSrc.to",
    id: "vidsrc",
    url: (id: string) => `https://vidsrc.to/embed/movie/${id}`,
    icon: Zap,
  },
  {
    name: "vidsrc.me",
    id: "vidsrcme",
    url: (id: string) => `https://vidsrc.me/embed/${id}`,
    icon: Tv,
  },
];

export default function VideoPlayer({ movieId }: { movieId: string }) {
  const [activeSource, setActiveSource] = useState(PROVIDERS[0]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleSourceChange = (source: (typeof PROVIDERS)[0]) => {
    setActiveSource(source);
    setIsUnlocked(false); // Relock to keep the design consistent
    setIsLoading(true);
  };

  return (
    <div className="w-full space-y-6">
      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl ring-1 ring-white/10 group">
        {/* DESIGN OVERLAY: This keeps the app looking expensive */}
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

            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm font-black uppercase italic tracking-tighter text-white font-geist">
                Start Watching<span className="text-cyan-500">.</span>
              </p>
            </div>
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoading && isUnlocked && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
          </div>
        )}

        {/* THE PLAYER: No Sandbox = No "Unavailable" errors */}
        {isUnlocked && (
          <iframe
            src={activeSource.url(movieId)}
            className="absolute inset-0 w-full h-full z-10"
            allowFullScreen
            frameBorder="0"
            onLoad={() => setIsLoading(false)}
          />
        )}
      </div>

      {/* PRO SOURCE SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/20 p-3 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-3 px-4">
          <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            System Stream
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
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
      </div>
    </div>
  );
}
