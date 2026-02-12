"use client";

import { useState } from "react";
import {
  Zap,
  Play,
  ShieldCheck,
  Loader2,
  Globe2,
  Settings,
  FastForward,
  Layers,
  Activity,
  Cpu,
  X,
  Maximize2,
} from "lucide-react";
import SignalMonitor from "./signal-monitor";
import DirectLuminaLinker from "./direct-lumina-linker";

interface Provider {
  name: string;
  id: string;
  url: (id: string, s: number, e: number) => string;
  icon: any;
}

const PROVIDERS: Provider[] = [
  {
    name: "VidFast (Flash)",
    id: "vidfast",
    url: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
    icon: FastForward,
  },
  {
    name: "Videasy (Legacy)",
    id: "videasy",
    url: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    icon: Layers,
  },
  {
    name: "VidNest (Mirror)",
    id: "vidnest",
    url: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
    icon: Globe2,
  },
  {
    name: "VidLink (Direct)",
    id: "vidlink",
    url: (id, s, e) =>
      `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=06b6d4`,
    icon: Zap,
  },
  {
    name: "VidSrc (Global)",
    id: "vidsrc",
    url: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    icon: Globe2,
  },
];

export default function LuminaDramaPlayer({
  id,
  season,
  episode,
}: {
  id: string;
  season: number;
  episode: number;
}) {
  const [activeSource, setActiveSource] = useState<Provider>(PROVIDERS[0]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleSourceChange = (source: Provider) => {
    setActiveSource(source);
    setIsLoading(true);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-1000">
      <SignalMonitor />

      {/* 2. MAIN CINEMA VIEWPORT */}
      <div className="relative aspect-video w-full overflow-hidden bg-black border border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,1)] ring-1 ring-white/5 group">
        {/* THE STREAM ENGINE */}
        {isUnlocked && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in duration-700">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                <div className="relative flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                  <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    Handshaking {activeSource.id}...
                  </span>
                </div>
              </div>
            )}

            <iframe
              src={activeSource.url(id, season, episode)}
              className="w-full h-full grayscale-[0.05] contrast-[1.05]"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              onLoad={() => setIsLoading(false)}
            />
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
        {PROVIDERS.map((provider) => {
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
              <div className="flex flex-col items-start text-left">
                <span
                  className={`text-[11px] font-black uppercase tracking-widest ${isActive ? "text-black" : "text-white"}`}
                >
                  {provider.name}
                </span>
                <span
                  className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? "text-zinc-500" : "text-zinc-600"}`}
                >
                  {isActive ? "Currently Active" : "Available Source"}
                </span>
              </div>
              {isActive && (
                <div className="absolute right-6 w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3.5 DOWNLOAD SECTION */}
      <div className="flex justify-center py-4">
        <DirectLuminaLinker
          embedUrl={activeSource.url(id, season, episode)}
          title={`Lumina_k-drama_${id}`}
        />
      </div>

      {/* 4. SYSTEM STATUS FOOTER */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <Cpu className="w-4 h-4 text-cyan-500/50" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                Processor
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter text-left">
                Lumina Core TV
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/5 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest text-left">
              Resource Hash
            </span>
            <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-tighter">
              ID: {id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/50" />
          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            Protocol: Encrypted Direct Link
          </span>
        </div>
      </div>
    </div>
  );
}
