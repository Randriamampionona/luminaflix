"use client";

import { Info, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/container";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getDisplayTitle, getWatchHref, tmdbImage } from "@/lib/media";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Movie } from "@/typing";
import MovieDetails from "./movie-details";

const SLIDE_MS = 8000;
const MAX_SLIDES = 3;

export default function HeroSlider({ trendingMovies }: { trendingMovies: Movie[] }) {
  const t = useTranslations("home");
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = trendingMovies.slice(0, MAX_SLIDES);
  const count = slides.length;

  // PERF/UX: a timeout keyed on the active slide (instead of a free-running
  // interval) so a manual click restarts the countdown and the progress bar
  // stays in sync. Paused in background tabs and for reduced motion.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(() => setActiveIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, count, paused, reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("heroLabel")}
      className="relative h-[90vh] min-h-150 w-full overflow-hidden bg-black md:h-screen"
    >
      {slides.map((movie, index) => {
        const isActive = index === activeIndex;
        const title = getDisplayTitle(movie);
        const backdrop = tmdbImage(movie.backdrop_path);
        return (
          <div
            key={movie.id}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-all duration-1500 ease-in-out motion-reduce:transition-none",
              isActive ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-110 opacity-0",
            )}
          >
            <div className="absolute inset-0">
              {backdrop && (
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className="object-cover opacity-50"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
            </div>

            {/* UI STANDARD: hero copy aligns with the shared container. */}
            <Container className="relative z-10 flex h-full flex-col justify-center">
              <div
                className={cn(
                  "max-w-2xl space-y-6 transition-all delay-300 duration-1000 motion-reduce:transition-none",
                  isActive ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0",
                )}
              >
                <p className="flex items-center gap-3">
                  <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-black shadow-[0_0_15px_#06b6d4]">
                    {t("heroBadge")}
                  </span>
                </p>

                <h2 className={cn(typo.display, "line-clamp-2 drop-shadow-2xl")}>
                  {title}
                  <span className="not-italic text-cyan-500">.</span>
                </h2>

                <p className="line-clamp-3 max-w-xl text-base font-medium leading-relaxed text-white/70 md:text-lg">
                  {movie.overview}
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href={getWatchHref(movie.id, "movie")}
                    tabIndex={isActive ? 0 : -1}
                    className="group flex items-center gap-3 rounded-full bg-white px-8 py-3 text-xs font-black uppercase text-black transition-colors duration-500 hover:bg-cyan-500 hover:text-white md:px-10 md:py-4 md:text-sm"
                  >
                    <Play className="h-5 w-5 fill-current" />
                    {t("playNow")}
                  </Link>
                  <MovieDetails movie={movie}>
                    <button
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      className="flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/10 px-8 py-3 text-xs font-black uppercase text-white backdrop-blur-xl transition-colors hover:bg-white/20 md:px-10 md:py-4 md:text-sm"
                    >
                      <Info className="h-5 w-5 text-cyan-400" />
                      {t("moreInfo")}
                    </button>
                  </MovieDetails>
                </div>
              </div>
            </Container>
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4">
          {slides.map((movie, i) => {
            const isActive = activeIndex === i;
            return (
              <button
                key={movie.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={t("slide", { index: i + 1 })}
                aria-current={isActive}
                className="group relative flex cursor-pointer flex-col items-center p-2"
              >
                <span
                  className={cn(
                    "relative h-1.5 overflow-hidden rounded-md transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isActive ? "w-12 bg-white/20" : "w-6 bg-white/5 group-hover:bg-white/10",
                  )}
                >
                  {isActive && (
                    <span
                      key={`${activeIndex}-${paused}`}
                      className={cn(
                        "absolute inset-0 origin-left bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]",
                        !paused && !reducedMotion && "animate-[hero-progress_8s_linear_forwards]",
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_15px_#06b6d4]" />
    </section>
  );
}
