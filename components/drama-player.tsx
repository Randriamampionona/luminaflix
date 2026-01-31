"use client";

import { useState } from "react";
import { Play, ShieldCheck, Zap } from "lucide-react";

interface DramaPlayerProps {
  id: string;
  season: number;
  episode: number;
}

export default function LuminaDramaPlayer({
  id,
  season,
  episode,
}: DramaPlayerProps) {
  const [activeProvider, setActiveProvider] = useState<"vidlink" | "vidsrc">(
    "vidlink"
  );

  const EN_PROVIDERS = {
    vidlink: `https://vidlink.pro/tv/${id}/${season}/${episode}?primaryColor=06b6d4`,
    vidsrc: `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
  };

  return (
    <div className="space-y-6">
      {/* THEATER VIEWPORT */}
      <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl">
        {/* Source Header Bridge */}
        <div className="absolute top-0 inset-x-0 h-12 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
              Encrypted Stream: {activeProvider}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            <ShieldCheck className="w-3 h-3 text-cyan-500" />
            <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">
              Secured
            </span>
          </div>
        </div>

        {/* The Actual Iframe */}
        <iframe
          src={EN_PROVIDERS[activeProvider]}
          className="w-full h-full pt-12"
          allowFullScreen
          scrolling="no"
        />
      </div>

      {/* PROVIDER SWITCHER */}
      <div className="flex items-center gap-4 justify-center">
        <button
          onClick={() => setActiveProvider("vidlink")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeProvider === "vidlink"
              ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              : "bg-zinc-900 text-zinc-500 border border-white/5 hover:border-white/20"
          }`}
        >
          <Zap
            className={`w-3 h-3 ${
              activeProvider === "vidlink" ? "fill-current" : ""
            }`}
          />
          VidLink (Primary)
        </button>

        <button
          onClick={() => setActiveProvider("vidsrc")}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeProvider === "vidsrc"
              ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              : "bg-zinc-900 text-zinc-500 border border-white/5 hover:border-white/20"
          }`}
        >
          <Play
            className={`w-3 h-3 ${
              activeProvider === "vidsrc" ? "fill-current" : ""
            }`}
          />
          VidSrc (Mirror)
        </button>
      </div>
    </div>
  );
}
