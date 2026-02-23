"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, FastForward } from "lucide-react";

export default function TrailerAdEngine({
  vastUrl,
  youtubeKey,
  lang,
}: {
  vastUrl: string;
  youtubeKey: string;
  lang: string;
}) {
  const [adFinished, setAdFinished] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerInstance = useRef<any>(null);

  useEffect(() => {
    // Load Fluid Player SDK
    const script = document.createElement("script");
    script.src = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js";
    script.async = true;
    document.head.appendChild(script);

    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "https://cdn.fluidplayer.com/v3/current/fluidplayer.min.css";
    document.head.appendChild(style);

    script.onload = () => {
      if (videoRef.current && (window as any).fluidPlayer) {
        playerInstance.current = (window as any).fluidPlayer(videoRef.current, {
          layoutControls: {
            fillToContainer: true,
            primaryColor: "#06b6d4",
            autoPlay: true,
            playButtonShowing: false,
            mute: false,
          },
          vastOptions: {
            adList: [{ roll: "preRoll", vastTag: vastUrl }],
            adStartedCallback: () => setIsAdPlaying(true),
            adFinishedCallback: () => setAdFinished(true),
            adErrorCallback: () => setAdFinished(true),
          },
        });
      }
    };

    return () => {
      if (playerInstance.current) playerInstance.current.destroy();
    };
  }, [vastUrl]);

  if (adFinished) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1&hl=${lang}`}
        className="w-full h-full grayscale-[0.1] contrast-[1.05] animate-in fade-in duration-1000"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={videoRef} className="w-full h-full">
        <source src="about:blank" type="video/mp4" />
      </video>

      {!isAdPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-20">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="mt-4 text-[8px] font-black uppercase tracking-[0.4em] text-zinc-600">
            Initializing Secure Link...
          </p>
        </div>
      )}

      {isAdPlaying && (
        <button
          onClick={() => setAdFinished(true)}
          className="absolute bottom-10 right-10 z-30 px-6 py-3 bg-white text-black font-black text-[9px] uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-cyan-500 transition-colors"
        >
          Skip Ad <FastForward className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
