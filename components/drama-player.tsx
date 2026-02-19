"use client";

import { useState, useEffect, useRef } from "react";
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
import StreamActionSuite from "./stream-action-suite";

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
  const [showTheater, setShowTheater] = useState(false);

  // --- AD ENGINE STATES ---
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  const AD_URL =
    "https://creamymouth.com/dkm/Fpz.dzG/NovfZzGvUu/Feumd9vuIZJUhlyk/P/TKYO4RMAD/kc2GMRj/UXtENqj/guwlORThYgy/O/QI";

  // Load SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
    script.async = true;
    document.head.appendChild(script);

    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css";
    document.head.appendChild(style);

    return () => {
      if (playerInstance.current) playerInstance.current.destroy();
    };
  }, []);

  // Ad Timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAdPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (isAdPlaying && timeLeft === 0) {
      setShowSkip(true);
    }
    return () => clearInterval(timer);
  }, [isAdPlaying, timeLeft]);

  const handleAdFinished = () => {
    if (playerInstance.current) {
      playerInstance.current.destroy();
      playerInstance.current = null;
    }
    setIsAdPlaying(false);
    setIsUnlocked(true); // Shows the Bridge/Protocol screen
  };

  const startAdSequence = () => {
    setIsAdPlaying(true);
    setTimeLeft(15);
    setShowSkip(false);

    setTimeout(() => {
      // @ts-ignore
      if (window.fluidPlayer && videoRef.current) {
        // @ts-ignore
        playerInstance.current = window.fluidPlayer(videoRef.current, {
          layoutControls: {
            fillToContainer: true,
            primaryColor: "#06b6d4",
            autoPlay: true,
            playButtonShowing: false,
            mute: false,
          },
          vastOptions: {
            adList: [{ roll: "preRoll", vastTag: AD_URL }],
            adFinishedCallback: handleAdFinished,
            adErrorCallback: handleAdFinished,
          },
        });
      } else {
        handleAdFinished();
      }
    }, 100);
  };

  const handleSourceChange = (source: Provider) => {
    setActiveSource(source);
    setIsUnlocked(false);
    setIsAdPlaying(false);
    setIsLoading(true);
    setShowTheater(false);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-1000">
      <SignalMonitor />

      {/* 2. MAIN CINEMA VIEWPORT */}
      <div className="flex items-end flex-col space-y-2">
        <div className="relative aspect-video w-full overflow-hidden bg-black border border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,1)] ring-1 ring-white/5 group">
          {/* AD PLAYER (Fluid Player) */}
          {isAdPlaying && (
            <div className="absolute inset-0 z-75 bg-black flex flex-col items-center justify-center">
              <video ref={videoRef} className="w-full h-full" />
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 backdrop-blur-md rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Sponsored Bypass Protocol
                </span>
              </div>
              <div className="absolute bottom-6 right-6 z-20 flex items-center gap-4">
                {!showSkip ? (
                  <div className="px-6 py-3 bg-black/80 border border-white/10 backdrop-blur-md rounded-xl text-white font-black text-[10px] uppercase tracking-widest">
                    Lumina Bypass in{" "}
                    <span className="text-cyan-400">{timeLeft}s</span>
                  </div>
                ) : (
                  <button
                    onClick={handleAdFinished}
                    className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    Skip Ad & Play
                  </button>
                )}
              </div>
            </div>
          )}

          {/* THE STREAM ENGINE (Iframe Theater) */}
          {showTheater && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between px-6 py-3 bg-zinc-950/90 border-b border-white/5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500">
                  Lumina Virtual Console — {activeSource.name}
                </span>
                <button
                  onClick={() => setShowTheater(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative flex-1">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
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
            </div>
          )}

          {/* BRIDGE LAUNCHER (After Ad) */}
          {isUnlocked && !showTheater && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950 px-6">
              <div className="text-center space-y-8 relative z-10">
                <div className="hidden relative w-24 h-24 mx-auto bg-black border border-white/10 rounded-3xl md:flex items-center justify-center">
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
                  className="group/btn relative px-12 py-4 bg-white text-black font-black rounded-2xl transition-all hover:bg-cyan-500 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                >
                  <div className="flex items-center gap-3 relative z-10 uppercase text-xs tracking-widest text-nowrap">
                    Start Virtual Stream <Maximize2 className="w-4 h-4" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* INITIAL UNLOCK SPLASH */}
          {!isUnlocked && !isAdPlaying && (
            <div
              onClick={startAdSequence}
              className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black transition-all duration-1000 group/unlock"
            >
              <div className="absolute inset-0 bg-linear-to-t from-cyan-950/20 to-transparent" />
              <div className="relative">
                <div className="absolute inset-0 blur-3xl bg-cyan-500/30 scale-150 animate-pulse" />
                <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.4)] group-hover/unlock:scale-110 transition-all duration-700">
                  <Play className="w-7 h-7 md:w-12 md:h-12 text-black fill-current translate-x-1" />
                </div>
              </div>
              <p className="hidden md:block mt-8 md:mt-12 text-[12px] font-black uppercase italic tracking-[0.5em] text-white/80 group-hover/unlock:text-cyan-400 transition-colors">
                Initialize Lumina <span className="text-cyan-500">Theater</span>
              </p>
            </div>
          )}
        </div>
        <StreamActionSuite
          type="K_DRAMA"
          mediaId={id}
          season={season}
          episode={episode}
        />
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
              className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 border group ${isActive ? "bg-white border-white shadow-[0_20px_40px_-15px_rgba(255,255,255,0.2)]" : "bg-zinc-900/40 border-white/5 hover:border-white/20"}`}
            >
              <div
                className={`p-3 rounded-xl transition-colors duration-500 ${isActive ? "bg-black text-cyan-500" : "bg-white/5 text-zinc-500 group-hover:text-white"}`}
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
