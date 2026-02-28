"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Loader2, AlertTriangle } from "lucide-react";

export default function TrailerAdEngine({
  trailerKey,
  lang,
}: {
  trailerKey: string;
  lang: string;
}) {
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adStarted, setAdStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showSkip, setShowSkip] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Watchdog States
  const [watchdogTime, setWatchdogTime] = useState(30);
  const [showEmergencyBypass, setShowEmergencyBypass] = useState(false);
  const retryCount = useRef(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  const AD_URL =
    "https://creamymouth.com/dYmCF.zCdOGIN/vUZTGiUn/Weomq9au/ZEU_l/kFPXToYe4tMiD/kf2FMzjKUttHN_jIgEwgOwTbYOypObQi";

  useEffect(() => {
    if (!document.querySelector('script[src*="fluidplayer"]')) {
      const script = document.createElement("script");
      script.src = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
      script.async = true;
      document.head.appendChild(script);

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css";
      document.head.appendChild(style);
    }
    return () => {
      if (playerInstance.current) playerInstance.current.destroy();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const video = videoRef.current;

    const handleHeartbeat = () => {
      if (video && video.currentTime > 0 && !video.paused) {
        if (!adStarted) setAdStarted(true);
        // Reset watchdog if video moves
        setShowEmergencyBypass(false);
      }
    };

    if (isAdPlaying && video) {
      video.addEventListener("timeupdate", handleHeartbeat);

      timer = setInterval(() => {
        if (adStarted && !video.paused && timeLeft > 0) {
          setTimeLeft((prev) => prev - 1);
        } else if (adStarted && timeLeft === 0) {
          setShowSkip(true);
        }
      }, 1000);
    }

    return () => {
      if (video) video.removeEventListener("timeupdate", handleHeartbeat);
      clearInterval(timer);
    };
  }, [isAdPlaying, adStarted, timeLeft]);

  // WATCHDOG TIMER - Now actively using watchdogTime state
  useEffect(() => {
    let watchdog: NodeJS.Timeout;
    if (isAdPlaying && !adStarted) {
      watchdog = setInterval(() => {
        setWatchdogTime((prev) => {
          if (prev <= 1) {
            setShowEmergencyBypass(true);
            clearInterval(watchdog);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearInterval(watchdog);
      // Reset watchdog if component closes or ad starts
      if (adStarted) setWatchdogTime(30);
    };
  }, [isAdPlaying, adStarted]);

  const handleAdFinished = () => {
    if (playerInstance.current) {
      playerInstance.current.destroy();
      playerInstance.current = null;
    }
    setIsAdPlaying(false);
    setIsUnlocked(true);
  };

  const triggerAd = () => {
    setIsAdPlaying(true);
    const initPlayer = () => {
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
            adStartedCallback: () => {
              setAdStarted(true);
              setShowEmergencyBypass(false);
            },
            adFinishedCallback: handleAdFinished,
            adErrorCallback: handleAdFinished,
          },
        });
      } else if (retryCount.current < 10) {
        retryCount.current++;
        setTimeout(initPlayer, 300);
      } else {
        handleAdFinished();
      }
    };
    initPlayer();
  };

  if (isUnlocked) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&hl=${lang}`}
        className="w-full h-full grayscale-[0.1] contrast-[1.05]"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {isAdPlaying ? (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} className="w-full h-full" playsInline />

          {!adStarted && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020202]/90 backdrop-blur-xl">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-6" />
              <div className="text-center space-y-4 px-6">
                <div className="space-y-1">
                  <span className="block text-[10px] font-black uppercase tracking-[0.5em] text-cyan-500 animate-pulse">
                    Synchronizing Ad Signal
                  </span>
                  {/* UI USE OF WATCHDOG TIME */}
                  {!showEmergencyBypass && (
                    <span className="block text-[8px] text-zinc-500 font-mono uppercase tracking-widest">
                      Timeout in: {watchdogTime}s
                    </span>
                  )}
                </div>

                {showEmergencyBypass && (
                  <button
                    onClick={handleAdFinished}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/40 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all duration-300 mx-auto"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Emergency Signal Bypass
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-12 right-0 z-20">
            {adStarted && !showSkip && (
              <div className="px-8 py-4 bg-black/90 border border-white/10 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-4">
                <div className="w-1 h-1 rounded-full bg-cyan-500 animate-ping" />
                <span>
                  Bypass in <span className="text-cyan-400">{timeLeft}s</span>
                </span>
              </div>
            )}
            {showSkip && (
              <button
                onClick={handleAdFinished}
                className="px-8 py-4 bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-cyan-500 transition-all shadow-[0_0_40px_rgba(6,182,212,0.2)]"
              >
                Skip & Play Trailer
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={triggerAd}
          className="absolute inset-0 z-40 cursor-pointer flex flex-col items-center justify-center group bg-[#050505]"
        >
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-all duration-700">
            <Play className="w-10 h-10 text-black fill-current translate-x-1" />
          </div>
          <p className="mt-8 text-[11px] font-black uppercase italic tracking-[0.5em] text-white/70 group-hover:text-cyan-400 transition-colors">
            Initialize <span className="text-cyan-500">Lumina</span> Trailer
          </p>
        </div>
      )}
    </div>
  );
}
