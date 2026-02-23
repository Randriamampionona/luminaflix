"use client";

import { useState, useEffect, useRef } from "react";
import {
  Tv2,
  Globe2,
  Zap,
  Play,
  Loader2,
  ShieldCheck,
  Languages,
  X,
  FastForward,
  CloudLightning,
  Layers,
  Activity,
  Cpu,
  Volume2,
} from "lucide-react";
import SignalMonitor from "../signal-monitor";
import DirectLuminaLinker from "../direct-lumina-linker";
import StreamActionSuite from "../stream-action-suite";

// --- PROVIDER CONFIGURATION ---
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

  // --- AD ENGINE STATES ---
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adInitialized, setAdInitialized] = useState(false);
  const [adStarted, setAdStarted] = useState(false); // NEW: Syncs timer with video
  const [timeLeft, setTimeLeft] = useState(15);
  const [showSkip, setShowSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  const AD_URL =
    "https://creamymouth.com/d/mdFqzWd.GhNpvNZWGnUn/GeNme9qutZRU_lwkGPXT/Yf4fMPD/ka2VMRjYUStON/jagJwsOCT/YzyiOdQT";

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

  // Timer logic - Only decrements if adStarted is true
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (adStarted && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (adStarted && timeLeft === 0) {
      setShowSkip(true);
    }
    return () => clearInterval(timer);
  }, [adStarted, timeLeft]);

  const handleAdFinished = () => {
    if (playerInstance.current) {
      playerInstance.current.destroy();
      playerInstance.current = null;
    }
    setIsAdPlaying(false);
    setAdInitialized(false);
    setAdStarted(false);
    setIsUnlocked(true);
    setIsLoading(true);
  };

  const startAdSequence = () => {
    setIsAdPlaying(true);
    setTimeLeft(15);
    setShowSkip(false);
    setAdStarted(false);
  };

  // 1. Monitor the video element directly for playback
  useEffect(() => {
    let monitor: NodeJS.Timeout;

    if (adInitialized && !adStarted) {
      monitor = setInterval(() => {
        if (videoRef.current && videoRef.current.currentTime > 0.1) {
          setAdStarted(true);
          clearInterval(monitor);
        }
      }, 500);
    }

    return () => clearInterval(monitor);
  }, [adInitialized, adStarted]);

  // 2. Updated Trigger (Simplified)
  const triggerActualAd = () => {
    // @ts-ignore
    if (window.fluidPlayer && videoRef.current) {
      setAdInitialized(true);
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
          // Fallbacks in case the heartbeat misses
          adStartedCallback: () => setAdStarted(true),
          adFinishedCallback: handleAdFinished,
          adErrorCallback: handleAdFinished,
        },
      });

      // Force play call for mobile browsers
      videoRef.current.play().catch((e) => console.error("Playback failed", e));
    } else {
      handleAdFinished();
    }
  };

  const handleSourceChange = (source: Provider) => {
    setActiveSource(source);
    setIsUnlocked(false);
    setIsAdPlaying(false);
    setAdInitialized(false);
    setAdStarted(false);
    setIsLoading(true);
    setShowTheater(false);
  };

  const handleTabChange = (tab: "FR" | "EN") => {
    setActiveTab(tab);
    handleSourceChange(tab === "FR" ? FR_PROVIDERS[0] : EN_PROVIDERS[0]);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl">
          {(["FR", "EN"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                activeTab === tab
                  ? tab === "FR"
                    ? "bg-white text-black"
                    : "bg-cyan-500 text-black"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab} Channel
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-zinc-900/20 rounded-2xl border border-white/5">
          <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
        </div>
      </div>

      <SignalMonitor />

      <div className="flex items-end flex-col space-y-2">
        <div className="relative aspect-video max-h-[60vh] md:max-h-[69vh] w-full overflow-hidden bg-black border border-white/10 shadow-2xl ring-1 ring-white/5">
          {/* THEATER MODE */}
          {showTheater && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 bg-zinc-950 border-b border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                  Lumina Virtual Terminal — {activeSource.name}
                </span>
                <button
                  onClick={() => setShowTheater(false)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <iframe
                  src={activeSource.url(movieId, imdbId)}
                  className="w-full h-full grayscale-[0.1]"
                  allowFullScreen
                  allow="autoplay; encrypted-media"
                  onLoad={() => setIsLoading(false)}
                />
              </div>
            </div>
          )}

          {/* AD PLAYER CONTAINER */}
          {isAdPlaying && (
            <div className="absolute inset-0 z-75 bg-black flex flex-col items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full"
                playsInline
                preload="auto"
              />

              {/* STAGE 2 TRIGGER BUTTON */}
              {!adInitialized && (
                <div className="absolute inset-0 z-80 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
                  <button
                    onClick={triggerActualAd}
                    className="group flex flex-col items-center gap-6"
                  >
                    <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform">
                      <Volume2 className="w-8 h-8 text-black fill-current" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500">
                      Enable Media Stream
                    </span>
                  </button>
                </div>
              )}

              <div className="absolute top-1 left-1 z-20 flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 backdrop-blur-md rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Sponsored Bypass Protocol
                </span>
              </div>

              {/* SYNCED TIMER OVERLAY */}
              <div className="absolute bottom-12 right-0 z-20">
                {!adStarted ? (
                  <div className="flex items-center gap-3 px-6 py-4 bg-black/80 border border-cyan-500/30 backdrop-blur-md">
                    <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                    <span className="text-white font-black text-[10px] uppercase tracking-widest">
                      Syncing Ad Signal...
                    </span>
                  </div>
                ) : !showSkip ? (
                  <div className="px-8 py-4 bg-black/80 border border-white/10 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest">
                    Skip in <span className="text-cyan-400">{timeLeft}s</span>
                  </div>
                ) : (
                  <button
                    onClick={handleAdFinished}
                    className="px-8 py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer"
                  >
                    Skip & Play
                  </button>
                )}
              </div>
            </div>
          )}

          {/* NATIVE PLAYER */}
          {isUnlocked && !activeSource.isExternal && (
            <div className="absolute inset-0 z-10">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                </div>
              )}
              <iframe
                src={activeSource.url(movieId, imdbId)}
                className="w-full h-full"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
              />
            </div>
          )}

          {/* BYPASS PROTOCOL */}
          {isUnlocked && activeSource.isExternal && !showTheater && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950">
              <div className="text-center space-y-8">
                <ShieldCheck className="w-12 h-12 text-cyan-500 mx-auto animate-pulse" />
                <h3 className="text-xl font-black uppercase text-white tracking-tighter italic underline decoration-cyan-500 underline-offset-8">
                  Protocol Ready
                </h3>
                <button
                  onClick={() => {
                    setIsLoading(true);
                    setShowTheater(true);
                  }}
                  className="px-12 py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all uppercase text-xs tracking-widest shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  Start Virtual Stream
                </button>
              </div>
            </div>
          )}

          {/* INITIAL UNLOCK SPLASH */}
          {!isUnlocked && !isAdPlaying && (
            <div
              onClick={startAdSequence}
              className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black group/unlock"
            >
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.4)] group-hover/unlock:scale-110 transition-all duration-700">
                <Play className="w-7 h-7 md:w-12 md:h-12 text-black fill-current translate-x-1" />
              </div>
              <p className="mt-8 text-[12px] font-black uppercase italic tracking-[0.5em] text-white/80">
                Initialize Lumina <span className="text-cyan-500">Theater</span>
              </p>
            </div>
          )}
        </div>
        <StreamActionSuite type="MOVIE" mediaId={movieId} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(activeTab === "FR" ? FR_PROVIDERS : EN_PROVIDERS).map((provider) => {
          const Icon = provider.icon;
          const isActive = activeSource.id === provider.id;
          return (
            <button
              key={provider.id}
              onClick={() => handleSourceChange(provider)}
              className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 border ${
                isActive
                  ? "bg-white border-white"
                  : "bg-zinc-900/40 border-white/5"
              }`}
            >
              <div
                className={`p-3 rounded-xl ${isActive ? "bg-black text-cyan-500" : "bg-white/5 text-zinc-500"}`}
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
                  className={`text-[8px] font-bold uppercase ${isActive ? "text-zinc-500" : "text-zinc-600"}`}
                >
                  {provider.isExternal ? "Tunnel Access" : "Native Player"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <DirectLuminaLinker
          embedUrl={activeSource.url(movieId, imdbId)}
          title={`Lumina_${activeTab}_${movieId}`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-3">
          <Cpu className="w-4 h-4 text-cyan-500/50" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
            Lumina {activeTab}-X5 — {imdbId || movieId}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
          <Languages className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[9px] font-black uppercase text-zinc-400">
            Ready in {activeTab === "FR" ? "French" : "English"}
          </span>
        </div>
      </div>
    </div>
  );
}
