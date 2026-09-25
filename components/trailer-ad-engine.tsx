"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Play } from "lucide-react";

const AD_URL =
  "https://creamymouth.com/dYmCF.zCdOGIN/vUZTGiUn/Weomq9au/ZEU_l/kFPXToYe4tMiD/kf2FMzjKUttHN_jIgEwgOwTbYOypObQi";
const FLUID_JS = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
const FLUID_CSS = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css";
const AD_SECONDS = 15;
const WATCHDOG_SECONDS = 30;

interface FluidPlayerInstance {
  destroy: () => void;
}
type FluidPlayerFactory = (el: HTMLVideoElement, options: Record<string, unknown>) => FluidPlayerInstance;

declare global {
  interface Window {
    fluidPlayer?: FluidPlayerFactory;
  }
}

/**
 * Sponsor pre-roll before the YouTube trailer.
 * PERF/BUG FIX: the countdown and watchdog intervals used to be torn down and
 * re-created every second (state in the dependency array); they now run once
 * per phase and are always cleared on unmount.
 */
export default function TrailerAdEngine({ trailerKey, lang }: { trailerKey: string; lang: string }) {
  const t = useTranslations("trailer");
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adStarted, setAdStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AD_SECONDS);
  const [watchdogTime, setWatchdogTime] = useState(WATCHDOG_SECONDS);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<FluidPlayerInstance | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destroyPlayer = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    try {
      playerRef.current?.destroy();
    } catch {
      // Fluid Player can throw if its DOM was already removed.
    }
    playerRef.current = null;
  }, []);

  useEffect(() => {
    if (!document.querySelector(`script[src="${FLUID_JS}"]`)) {
      const script = document.createElement("script");
      script.src = FLUID_JS;
      script.async = true;
      document.head.appendChild(script);

      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = FLUID_CSS;
      document.head.appendChild(style);
    }
    return destroyPlayer;
  }, [destroyPlayer]);

  const finishAd = useCallback(() => {
    destroyPlayer();
    setIsAdPlaying(false);
    setIsUnlocked(true);
  }, [destroyPlayer]);

  // Detect real playback (some VAST tags never call adStartedCallback).
  useEffect(() => {
    const video = videoRef.current;
    if (!isAdPlaying || adStarted || !video) return;
    const onTime = () => {
      if (video.currentTime > 0 && !video.paused) setAdStarted(true);
    };
    video.addEventListener("timeupdate", onTime);
    return () => video.removeEventListener("timeupdate", onTime);
  }, [isAdPlaying, adStarted]);

  // Skip countdown — one interval for the whole ad.
  useEffect(() => {
    if (!isAdPlaying || !adStarted) return;
    const id = setInterval(() => {
      const video = videoRef.current;
      if (video && video.paused) return;
      setTimeLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isAdPlaying, adStarted]);

  // Watchdog — offers a bypass if the ad never starts.
  useEffect(() => {
    if (!isAdPlaying || adStarted) return;
    const id = setInterval(() => setWatchdogTime((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [isAdPlaying, adStarted]);

  const triggerAd = () => {
    setIsAdPlaying(true);
    setAdStarted(false);
    setTimeLeft(AD_SECONDS);
    setWatchdogTime(WATCHDOG_SECONDS);

    let attempts = 0;
    const init = () => {
      if (window.fluidPlayer && videoRef.current) {
        playerRef.current = window.fluidPlayer(videoRef.current, {
          layoutControls: {
            fillToContainer: true,
            primaryColor: "#06b6d4",
            autoPlay: true,
            playButtonShowing: false,
            mute: false,
          },
          vastOptions: {
            adList: [{ roll: "preRoll", vastTag: AD_URL }],
            adStartedCallback: () => setAdStarted(true),
            adFinishedCallback: finishAd,
            adErrorCallback: finishAd,
          },
        });
      } else if (attempts++ < 10) {
        retryTimer.current = setTimeout(init, 300);
      } else {
        finishAd();
      }
    };
    // Wait one frame so the <video> element is mounted.
    requestAnimationFrame(init);
  };

  if (isUnlocked) {
    return (
      <iframe
        title={t("playTrailer")}
        src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&hl=${lang}`}
        className="h-full w-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  const showBypass = watchdogTime === 0;
  const showSkip = adStarted && timeLeft === 0;

  return (
    <div className="relative h-full w-full bg-black">
      {isAdPlaying ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <video ref={videoRef} className="h-full w-full" playsInline />

          {!adStarted && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#020202]/90 backdrop-blur-xl">
              <Loader2 className="mb-6 h-12 w-12 animate-spin text-cyan-500" />
              <div className="space-y-4 px-6 text-center" aria-live="polite">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">{t("loadingAd")}</p>
                {!showBypass && (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                    {t("timeout", { seconds: watchdogTime })}
                  </p>
                )}
                {showBypass && (
                  <button
                    type="button"
                    onClick={finishAd}
                    className="mx-auto flex cursor-pointer items-center gap-2 border border-red-500/40 bg-red-500/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all duration-300 hover:bg-red-500 hover:text-white"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {t("bypass")}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="absolute right-0 bottom-12 z-20">
            {adStarted && !showSkip && (
              <div className="flex items-center gap-4 border border-white/10 bg-black/90 px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white backdrop-blur-md">
                <span className="h-1 w-1 animate-ping rounded-full bg-cyan-500" />
                {t("skipIn", { seconds: timeLeft })}
              </div>
            )}
            {showSkip && (
              <button
                type="button"
                onClick={finishAd}
                className="cursor-pointer bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-black shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-500"
              >
                {t("skipNow")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerAd}
          className="group absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-[#050505]"
        >
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_0_60px_rgba(6,182,212,0.3)] transition-all duration-700 group-hover:scale-110">
            <Play className="h-10 w-10 translate-x-1 fill-current text-black" />
          </span>
          <span className="mt-8 text-[11px] font-black uppercase italic tracking-[0.4em] text-white/70 transition-colors group-hover:text-cyan-400">
            {t("playTrailer")}
          </span>
        </button>
      )}
    </div>
  );
}
