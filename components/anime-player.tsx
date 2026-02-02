"use client";

import { useState } from "react";
import { Zap, Globe, Tv, Play, FastForward } from "lucide-react";

interface Provider {
  name: string;
  id: string;
  url: (id: string, s: number, e: number) => string;
  icon: any;
  isExternal?: boolean;
}

const FR_PROVIDERS: Provider[] = [
  {
    name: "Lumina 4K (Ultra)",
    id: "4khub",
    url: (id, s, e) => `https://4khdhub.store/watch/tv/${id}/${s}/${e}`, // Adjusted for TV path
    icon: Globe,
    isExternal: true,
  },
  {
    name: "Lumina Best (FR)",
    id: "frembed",
    url: (id, s, e) =>
      `https://play.frembed.best/api/serie.php?id=${id}&sa=${s}&epi=${e}`,
    icon: Tv,
    isExternal: true,
  },
];

const EN_PROVIDERS: Provider[] = [
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
    name: "VidLink.pro",
    id: "vidlink",
    url: (id, s, e) =>
      `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=06b6d4`,
    icon: Globe,
  },
  {
    name: "VidSrc.to",
    id: "vidsrc",
    url: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    icon: Zap,
  },
];

export default function LuminaAnimePlayer({
  id,
  season,
  episode,
}: {
  id: string;
  season: number;
  episode: number;
}) {
  const [activeProvider, setActiveProvider] = useState(EN_PROVIDERS[0]);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* The Iframe Bridge */}
      <div className="relative aspect-video w-full bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <iframe
          src={activeProvider.url(id, season, episode)}
          className="w-full h-full"
          allowFullScreen
          scrolling="no"
        />
      </div>

      {/* Provider Switching Station */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...EN_PROVIDERS, ...FR_PROVIDERS].map((provider) => (
          <button
            key={provider.id}
            onClick={() => setActiveProvider(provider)}
            className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
              activeProvider.id === provider.id
                ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:border-cyan-500/50 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <provider.icon className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {provider.name}
              </span>
            </div>
            {activeProvider.id === provider.id && (
              <Play className="w-3 h-3 fill-current" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
