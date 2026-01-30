"use client";

import { useState, useEffect } from "react";
import {
  Tv,
  Globe,
  Zap,
  Play,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Languages,
  X,
  Maximize2,
} from "lucide-react";

interface Provider {
  name: string;
  id: string;
  url: (id: string) => string;
  icon: any;
  isExternal?: boolean;
}

const FR_PROVIDERS: Provider[] = [
  // {
  //   name: "Lumina Vix (FR)",
  //   id: "vixsrc",
  //   // Updated path to fix 404 - using the direct mirror path
  //   url: (id: string) => `https://vixsrc.to/movie/${id}?lang=fra`,
  //   icon: Zap,
  //   isExternal: true,
  // },
  {
    name: "Lumina 4K (Ultra)",
    id: "4khub",
    url: (id: string) => `https://4khdhub.store/watch/${id}`,
    icon: Globe,
    isExternal: true,
  },
  {
    name: "Lumina Best (FR)",
    id: "frembed",
    url: (id: string) => `https://play.frembed.best/api/film.php?id=${id}`,
    icon: Tv,
    isExternal: true,
  },
];

const EN_PROVIDERS: Provider[] = [
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
    <div className="w-full space-y-6">
      {/* 1. LANGUAGE SELECTOR */}
      <div className="flex items-center gap-2 p-1 bg-zinc-950/50 border border-white/5 rounded-2xl w-fit">
        <button
          onClick={() => handleTabChange("FR")}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "FR"
              ? "bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4]"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          Français (Bridge)
        </button>
        <button
          onClick={() => handleTabChange("EN")}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === "EN"
              ? "bg-white text-black"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          English (Player)
        </button>
      </div>

      {/* 2. MAIN PLAYER CONTAINER */}
      <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl ring-1 ring-white/10 group">
        {/* INTERNAL THEATER (Only shows inside the player frame) */}
        {showTheater && (
          <div className="absolute inset-0 z-60 bg-black flex flex-col animate-in slide-in-from-bottom-5 duration-500">
            {/* Header Mini-Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 border-b border-white/5">
              <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">
                Lumina Virtual Browser — {activeSource.name}
              </span>
              <button
                onClick={() => setShowTheater(false)}
                className="p-1 hover:bg-white/10 rounded-md transition-all text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Iframe for the "Bridge" Link */}
            <div className="flex-1 bg-black">
              <iframe
                src={activeSource.url(movieId)}
                className="w-full h-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          </div>
        )}

        {/* NATIVE PLAYER (EN Only) */}
        {isUnlocked && !activeSource.isExternal && (
          <div className="absolute inset-0 z-10">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
              </div>
            )}
            <iframe
              src={activeSource.url(movieId)}
              className="w-full h-full"
              allowFullScreen
              frameBorder="0"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        )}

        {/* BRIDGE PRE-LAUNCH (FR Only) */}
        {isUnlocked && activeSource.isExternal && !showTheater && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl px-6">
            <div className="text-center space-y-6 max-w-sm">
              <div className="relative w-20 h-20 mx-auto bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-cyan-500" />
                <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase text-white tracking-tighter">
                  Tunnel Ready:{" "}
                  <span className="text-cyan-500">{activeSource.name}</span>
                </h3>
                <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold">
                  Bypass mode enabled. Open movie inside Lumina?
                </p>
              </div>

              <button
                onClick={() => {
                  setIsLoading(true);
                  setShowTheater(true);
                }}
                className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                START IN-PLAYER <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* INITIAL UNLOCK OVERLAY */}
        {!isUnlocked && (
          <div
            onClick={() => setIsUnlocked(true)}
            className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl group"
          >
            <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.3)] group-hover:scale-110 group-hover:bg-cyan-500 transition-all duration-500">
              <Play className="w-10 h-10 text-black fill-current ml-1" />
            </div>
            <p className="mt-8 text-sm font-black uppercase italic tracking-tighter text-white">
              Initialize Lumina{" "}
              <span className="text-cyan-500">{activeTab}</span>
            </p>
          </div>
        )}
      </div>

      {/* 3. PROVIDER SELECTION BAR */}
      <div className="flex flex-wrap gap-2 bg-zinc-900/20 p-3 rounded-[2rem] border border-white/5">
        {(activeTab === "FR" ? FR_PROVIDERS : EN_PROVIDERS).map((provider) => {
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
                className={`w-4 h-4 ${activeSource.id === provider.id ? "text-cyan-600" : ""}`}
              />
              {provider.name}
            </button>
          );
        })}
      </div>

      {/* 4. FOOTER STATUS */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/10 rounded-2xl border border-white/5">
        <div className="flex items-center gap-4 text-zinc-600">
          <Languages className="w-3 h-3 text-cyan-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            {activeTab} Mode
          </span>
          <div className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span className="text-[9px] font-bold uppercase tracking-widest">
            Cinema v5.2
          </span>
        </div>
      </div>
    </div>
  );
}
