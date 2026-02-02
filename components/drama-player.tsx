"use client";

import { useState } from "react";
import {
  Zap,
  Play,
  ShieldCheck,
  Loader2,
  Globe,
  Settings,
  FastForward,
} from "lucide-react";

interface Provider {
  name: string;
  id: string;
  url: (id: string, s: number, e: number) => string;
  icon: any;
}

const PROVIDERS: Provider[] = [
  {
    name: "VidFast (Speed)",
    id: "vidfast",
    url: (id, s, e) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
    icon: FastForward,
  },
  {
    name: "Videasy (Alternative)",
    id: "videasy",
    url: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
    icon: FastForward,
  },
  {
    name: "111movies.com",
    id: "111movies",
    url: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
    icon: FastForward,
  },
  {
    name: "VidLink (Primary)",
    id: "vidlink",
    url: (id, s, e) =>
      `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=06b6d4`,
    icon: Zap,
  },
  {
    name: "VidSrc (Mirror)",
    id: "vidsrc",
    url: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    icon: Globe,
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
    // Keep isUnlocked true once they've started the session
  };

  return (
    <div className="w-full space-y-6">
      {/* NATIVE VIEWPORT */}
      <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl ring-1 ring-white/5">
        {/* THE STREAM ENGINE */}
        {isUnlocked && (
          <div className="absolute inset-0 z-10 bg-black animate-in fade-in duration-700">
            {/* Loading State Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    Handshaking {activeSource.id}...
                  </span>
                </div>
              </div>
            )}

            {/* Actual Embed */}
            <iframe
              src={activeSource.url(id, season, episode)}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )}

        {/* INITIAL UNLOCK OVERLAY (Only shows once per session) */}
        {!isUnlocked && (
          <div
            onClick={() => setIsUnlocked(true)}
            className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl group"
          >
            <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.4)] group-hover:scale-110 group-hover:bg-cyan-500 transition-all duration-700">
              <Play className="w-10 h-10 text-black fill-current ml-1" />
            </div>
            <p className="mt-8 text-[11px] font-black uppercase italic tracking-[0.4em] text-white">
              Launch Lumina <span className="text-cyan-500">Theater</span>
            </p>
          </div>
        )}
      </div>

      {/* PROVIDER SWITCHER BAR */}
      <div className="flex flex-wrap items-center gap-4 justify-center bg-zinc-900/20 p-3 rounded-[2rem] border border-white/5 w-fit mx-auto">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          return (
            <button
              key={provider.id}
              onClick={() => handleSourceChange(provider)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                activeSource.id === provider.id
                  ? "bg-white border-white text-black shadow-lg"
                  : "bg-black/40 border-white/5 text-zinc-500 hover:text-white hover:border-white/20"
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${activeSource.id === provider.id ? "text-cyan-600" : ""}`}
              />
              {provider.name}
            </button>
          );
        })}
      </div>

      {/* STATUS FOOTER */}
      <div className="flex items-center justify-between px-8 py-4 bg-zinc-900/10 rounded-3xl border border-white/5 max-w-2xl mx-auto">
        <div className="flex items-center gap-6 text-zinc-600">
          <div className="flex items-center gap-2">
            <Settings className="w-3 h-3 text-cyan-500" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
              Direct Link:{" "}
              <span className="text-cyan-500">{activeSource.id}</span>
            </span>
          </div>
          <div className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            S{season} : E{episode}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-cyan-500/50" />
          <span className="text-[8px] font-black text-cyan-500/70 uppercase">
            Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
