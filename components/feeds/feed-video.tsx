"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Facebook video / Reel: muted autoplay, looping, and only while at least 30 %
 * of it is on screen (saves data, like a real feed). A button turns the sound on.
 */
export default function FeedVideo({
  src,
  poster,
  reel,
  controls = false,
  className,
}: {
  src: string | null;
  poster: string | null;
  reel?: boolean;
  controls?: boolean;
  className?: string;
}) {
  const t = useTranslations("feeds");
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.3) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: [0, 0.3] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  if (!src) {
    // Facebook didn't give the file (e.g. a shared video): poster only.
    return (
      <div className={cn("relative flex items-center justify-center bg-black", className)}>
        {poster && (
          // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL)
          <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
        )}
        <span className="absolute flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white">
          <Play className="h-6 w-6 fill-current" aria-hidden />
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative bg-black", className)}>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        loop
        playsInline
        autoPlay
        preload="metadata"
        controls={controls}
        className={cn("h-full w-full", reel ? "object-contain" : "object-cover")}
      />
      {reel && (
        <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-black tracking-widest text-white uppercase">
          Reel
        </span>
      )}
      {!controls && (
        <button
          type="button"
          data-no-smartlink
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          aria-label={muted ? t("soundOn") : t("soundOff")}
          className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
        >
          {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </div>
  );
}
