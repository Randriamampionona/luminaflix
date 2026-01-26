"use client";

import { useState } from "react";
import { Tv, Globe, Zap } from "lucide-react";

const PROVIDERS = [
  {
    name: "VidSrc.to",
    id: "vidsrc",
    url: (id: string) => `https://vidsrc.to/embed/movie/${id}`,
    icon: Zap,
  },
  {
    name: "VidLink.pro",
    id: "vidlink",
    url: (id: string) => `https://vidlink.pro/movie/${id}`,
    icon: Globe,
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

  return (
    <div className="w-full space-y-6">
      {/* The Iframe Container */}
      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl ring-1 ring-white/10">
        <iframe
          src={activeSource.url(movieId)}
          className="absolute inset-0 w-full h-full"
          allowFullScreen
          frameBorder="0"
        />
      </div>

      {/* Modern Source Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mr-2">
          Server Select:
        </span>
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          return (
            <button
              key={provider.id}
              onClick={() => setActiveSource(provider)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border ${
                activeSource.id === provider.id
                  ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {provider.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
