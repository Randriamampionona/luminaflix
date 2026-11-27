"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { FbMedia } from "@/lib/facebook";
import { cn } from "@/lib/utils";
import FeedVideo from "./feed-video";

/** Detail page: every image / video of a post, one at a time (swipe, arrows, dots). */
export default function PostCarousel({ media, reel }: { media: FbMedia[]; reel: boolean }) {
  const t = useTranslations("feeds");
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(media.length - 1, i));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  if (media.length === 1 && media[0].kind === "video") {
    const v = media[0];
    return (
      <FeedVideo
        src={v.src}
        poster={v.poster}
        reel={reel}
        controls
        className={cn(
          "overflow-hidden rounded-3xl",
          reel ? "mx-auto aspect-9/16 h-[min(80vh,760px)] max-w-full" : "aspect-video w-full",
        )}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-black">
      <div
        ref={trackRef}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {media.map((m, i) => (
          <div key={i} className="flex h-[min(75vh,720px)] w-full shrink-0 snap-center items-center justify-center">
            {m.kind === "video" ? (
              <FeedVideo src={m.src} poster={m.poster} controls className="h-full w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL)
              <img src={m.src} alt="" loading={i < 2 ? "eager" : "lazy"} className="h-full w-full object-contain" />
            )}
          </div>
        ))}
      </div>
      {media.length > 1 && (
        <>
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
            {index + 1} / {media.length}
          </span>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label={t("previous")}
            className="absolute top-1/2 left-3 hidden -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 disabled:opacity-0 sm:block"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === media.length - 1}
            aria-label={t("next")}
            className="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white hover:bg-black/80 disabled:opacity-0 sm:block"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={t("goTo", { n: i + 1 })}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-white" : "w-1.5 bg-white/50")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
