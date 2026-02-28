"use client";

import { useState, useEffect, useRef } from "react";
import {
  Zap,
  Play,
  ShieldCheck,
  Loader2,
  Globe2,
  FastForward,
  Layers,
  Cpu,
  X,
  Volume2,
  AlertTriangle,
  Minimize,
  Maximize,
} from "lucide-react";
import SignalMonitor from "./signal-monitor";
import DirectLuminaLinker from "./direct-lumina-linker";
import StreamActionSuite from "./stream-action-suite";
import GuardProtocol from "./guard-protocol";

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

const IS_PROD = process.env.NODE_ENV === "production";

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
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);

  // --- AD ENGINE STATES ---
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adInitialized, setAdInitialized] = useState(false);
  const [adStarted, setAdStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(IS_PROD ? 15 : 3);
  const [showSkip, setShowSkip] = useState(false);

  // --- WATCHDOG PROTOCOL ---
  const [watchdogTime, setWatchdogTime] = useState(IS_PROD ? 45 : 5);
  const [syncFailed, setSyncFailed] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  const AD_URL =
    "https://creamymouth.com/dYmCF.zCdOGIN/vUZTGiUn/Weomq9au/ZEU_l/kFPXToYe4tMiD/kf2FMzjKUttHN_jIgEwgOwTbYOypObQi";

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

  // Timer logic for Ad Bypass
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (adStarted && timeLeft > 0) {
      timer = setInterval(() => {
        if (
          videoRef.current &&
          !videoRef.current.paused &&
          !videoRef.current.ended
        ) {
          setTimeLeft((prev) => prev - 1);
        }
      }, 1000);
    } else if (adStarted && timeLeft === 0) {
      setShowSkip(true);
    }
    return () => clearInterval(timer);
  }, [adStarted, timeLeft]);

  // Watchdog Safety Protocol
  useEffect(() => {
    let watchdog: NodeJS.Timeout;
    if (isAdPlaying && !adStarted && !syncFailed) {
      watchdog = setInterval(() => {
        setWatchdogTime((prev) => {
          if (prev <= 1) {
            setSyncFailed(true);
            clearInterval(watchdog);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(watchdog);
  }, [isAdPlaying, adStarted, syncFailed]);

  // Heartbeat Monitor logic
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

  // Prevent scrolling and handle orientation lock logic for mobile
  useEffect(() => {
    if (isCustomFullscreen) {
      document.body.style.overflow = "hidden";

      // Cast orientation to 'any' to bypass TS errors for .lock()
      const orientation = (window.screen.orientation ||
        (window.screen as any).mozOrientation ||
        (window.screen as any).msOrientation) as any;

      if (orientation && orientation.lock) {
        orientation.lock("landscape").catch(() => {
          // Fallback handled by CSS rotation in the JSX
        });
      }
    } else {
      document.body.style.overflow = "auto";
      const orientation = (window.screen.orientation ||
        (window.screen as any).mozOrientation ||
        (window.screen as any).msOrientation) as any;
      if (orientation && orientation.unlock) {
        orientation.unlock();
      }
    }
  }, [isCustomFullscreen]);

  const handleAdFinished = () => {
    if (playerInstance.current) {
      playerInstance.current.destroy();
      playerInstance.current = null;
    }
    setIsAdPlaying(false);
    setAdInitialized(false);
    setAdStarted(false);
    setSyncFailed(false);
    setWatchdogTime(IS_PROD ? 45 : 5);
    setIsUnlocked(true);
    setIsLoading(true);
  };

  const startAdSequence = () => {
    setIsAdPlaying(true);
    setTimeLeft(IS_PROD ? 15 : 3);
    setWatchdogTime(IS_PROD ? 45 : 5);
    setSyncFailed(false);
    setShowSkip(false);
    setAdStarted(false);
  };

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
        },
        vastOptions: {
          adList: [{ roll: "preRoll", vastTag: AD_URL }],
          adStartedCallback: () => setAdStarted(true),
          adFinishedCallback: handleAdFinished,
          adErrorCallback: handleAdFinished,
        },
      });
      videoRef.current.play().catch(() => {});
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
    setSyncFailed(false);
    setWatchdogTime(IS_PROD ? 45 : 5);
    setIsLoading(true);
    setShowTheater(false);
  };

  return (
    <GuardProtocol>
      <div className="w-full space-y-8 animate-in fade-in duration-1000">
        <SignalMonitor />

        <div className="flex items-end flex-col space-y-2">
          <div
            className={`overflow-hidden bg-black border border-white/10 shadow-2xl ring-1 ring-white/5 transition-all duration-500 ${
              isCustomFullscreen
                ? "fixed inset-0 p-0 m-0 z-9999 w-screen h-screen portrait:w-[100vh] portrait:h-[100vw] portrait:rotate-90 portrait:origin-center portrait:top-1/2 portrait:left-1/2 portrait:-translate-x-1/2 portrait:-translate-y-1/2"
                : "relative aspect-video max-h-[73vh] md:max-h-[77vh] w-full"
            }`}
          >
            {/* THEATER OVERLAY */}
            {showTheater && (
              <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between px-6 py-3 bg-zinc-950/90 border-b border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-500">
                    Lumina Virtual Console — {activeSource.name}
                  </span>
                  <button
                    onClick={() => setShowTheater(false)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-20">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">
                          Establishing Link
                        </span>
                      </div>
                    </div>
                  )}
                  <iframe
                    src={activeSource.url(id, season, episode)}
                    className="w-full h-full"
                    allowFullScreen
                    onLoad={() => setIsLoading(false)}
                  />
                </div>
              </div>
            )}

            {/* AD SYSTEM WITH WATCHDOG */}
            {isAdPlaying && (
              <div className="absolute inset-0 z-75 bg-black flex flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full"
                  playsInline
                  preload="auto"
                />

                {!adInitialized && !syncFailed && (
                  <div className="absolute inset-0 z-80 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md">
                    <button
                      onClick={triggerActualAd}
                      className="group flex flex-col items-center gap-6"
                    >
                      <div className="w-24 h-24 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.5)] group-hover:scale-110 transition-all duration-500">
                        <Volume2 className="w-10 h-10 text-black fill-current" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
                        Establish Media Link
                      </span>
                    </button>
                  </div>
                )}

                <div className="absolute bottom-12 right-0 z-20">
                  {syncFailed ? (
                    <div className="flex flex-col items-end gap-2 px-6 py-4 bg-red-500/10 border border-red-500/50 backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                        <span className="text-white font-black text-[10px] uppercase tracking-widest">
                          Handshake Interrupted
                        </span>
                      </div>
                      <button
                        onClick={handleAdFinished}
                        className="mt-2 px-6 py-2 bg-white text-black font-black text-[9px] uppercase tracking-[0.2em] hover:bg-cyan-500 transition-all"
                      >
                        Emergency Bypass
                      </button>
                    </div>
                  ) : !adStarted ? (
                    <div className="flex items-center gap-3 px-6 py-4 bg-black/80 border border-cyan-500/30 backdrop-blur-md">
                      <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">
                        Syncing Ad Signal ({watchdogTime}s)
                      </span>
                    </div>
                  ) : !showSkip ? (
                    <div className="px-10 py-5 bg-black/90 border border-white/10 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest">
                      Bypass in{" "}
                      <span className="text-cyan-400">{timeLeft}s</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleAdFinished}
                      className="px-10 py-5 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-500 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                      Skip & Play
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* BRIDGE PROTOCOL */}
            {isUnlocked && !showTheater && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950">
                <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
                  <div className="relative w-24 h-24 mx-auto">
                    <ShieldCheck className="w-24 h-24 text-cyan-500 relative z-10" />
                    <div className="absolute inset-0 bg-cyan-500/20 blur-2xl animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black uppercase text-white tracking-tighter italic">
                      Bypass Protocol Active
                    </h3>
                    <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">
                      Encrypted Link via {activeSource.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsLoading(true);
                      setShowTheater(true);
                    }}
                    className="px-12 py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-500 transition-all uppercase text-xs tracking-widest shadow-[0_0_50px_rgba(6,182,212,0.3)]"
                  >
                    Launch Cinema Stream
                  </button>
                </div>
              </div>
            )}

            {/* INITIAL GATE */}
            {!isUnlocked && !isAdPlaying && (
              <div
                onClick={startAdSequence}
                className="absolute inset-0 z-50 cursor-pointer flex flex-col items-center justify-center bg-black group/unlock"
              >
                <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.4)] group-hover/unlock:scale-110 transition-all duration-700">
                  <Play className="w-8 h-8 md:w-12 md:h-12 text-black fill-current translate-x-1" />
                </div>
                <p className="mt-8 text-[12px] font-black uppercase italic tracking-[0.5em] text-white/80">
                  Initialize Lumina{" "}
                  <span className="text-cyan-500">Theater</span>
                </p>
              </div>
            )}

            {/* MODERN CUSTOM FULLSCREEN BUTTON */}
            <button
              onClick={() => setIsCustomFullscreen(!isCustomFullscreen)}
              className={`
              absolute top-2 right-2 z-150
              group flex items-center gap-3 md:gap-0 md:hover:gap-3
              px-4 py-3 md:px-3 md:py-3 rounded-2xl
              bg-zinc-950/80 md:bg-zinc-950/60 backdrop-blur-2xl
              border border-white/10
              transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
              hover:border-cyan-500/50 hover:bg-zinc-900/80
              hover:shadow-[0_0_40px_rgba(6,182,212,0.25)]
              md:hover:pr-5
              active:scale-95
            `}
            >
              <div className="absolute inset-0 rounded-2xl bg-cyan-500/5 md:bg-cyan-500/0 md:group-hover:bg-cyan-500/5 transition-colors duration-500" />

              <div className="relative flex items-center justify-center w-6 h-6">
                {isCustomFullscreen ? (
                  <Minimize className="w-5 h-5 text-zinc-400 group-hover:text-white transition-all duration-300" />
                ) : (
                  <>
                    <Maximize className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-all duration-300 md:group-hover:rotate-90" />
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]" />
                  </>
                )}
              </div>

              {/* Label: Always visible on mobile, sliding on desktop */}
              <span
                className={`
                overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em]
                text-cyan-400 md:text-zinc-400 md:group-hover:text-cyan-400
                max-w-50 md:max-w-0 md:group-hover:max-w-37.5
                transition-all duration-500 ease-in-out
              `}
              >
                {isCustomFullscreen ? "Exit Terminal" : "Go Fullscreen"}
              </span>

              <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-white/20 group-hover:border-cyan-500/50 transition-colors" />
            </button>
          </div>
          <StreamActionSuite
            type="K_DRAMA"
            mediaId={id}
            season={season}
            episode={episode}
          />
        </div>

        {/* PROVIDER GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isActive = activeSource.id === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => handleSourceChange(provider)}
                className={`relative flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-500 border ${
                  isActive
                    ? "bg-white border-white shadow-xl scale-[1.02]"
                    : "bg-zinc-900/40 border-white/5 hover:border-white/20"
                }`}
              >
                <div
                  className={`p-3 rounded-xl transition-colors ${isActive ? "bg-black text-cyan-500" : "bg-white/5 text-zinc-500"}`}
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
                    {isActive ? "Link Established" : "Secondary Link"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center py-4">
          <DirectLuminaLinker
            embedUrl={activeSource.url(id, season, episode)}
            title={`Lumina_drama_${id}`}
          />
        </div>

        {/* FOOTER STATUS */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-5 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-cyan-500/50" />
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                  Architecture
                </span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                  Lumina Core TV
                </span>
              </div>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                Resource Hash
              </span>
              <span className="text-[10px] font-bold text-cyan-500/80 uppercase tracking-tighter">
                ID: {id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">
              AES-256 TUNNEL ACTIVE
            </span>
          </div>
        </div>
      </div>
    </GuardProtocol>
  );
}
