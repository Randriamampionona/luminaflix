"use client";

import { Clapperboard, Film, Flame, Info, Play, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/container";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { getDisplayTitle, getReleaseYear, getTrailerHref, getWatchHref, tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { Movie } from "@/typing";
import MovieDetails from "./movie-details";

const SLIDE_MS = 8000;
const MAX_SLIDES = 6;
const SWIPE_PX = 50;

type HeroMovie = Movie & { rank?: number };

/**
 * Home hero — today's trending movies, one per slide:
 * rank badge ("Tendance #1"), type, rating and year, title, genres, a short
 * summary, then Watch / Trailer / More info. Auto-advances every 8 s (paused
 * in background tabs and with reduced motion), swipe on phones, slide picker
 * with thumbnails on large screens.
 */
export default function HeroSlider({ trendingMovies }: { trendingMovies: HeroMovie[] }) {
  const t = useTranslations("home");
  const tg = useTranslations("genres");
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slides = trendingMovies.slice(0, MAX_SLIDES);
  const count = slides.length;
  const touch = useRef<{ x: number; y: number } | null>(null);

  // A timeout keyed on the active slide: a manual change restarts the countdown
  // and keeps the progress bar in sync.
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

  const go = (step: number) => setActiveIndex((i) => (i + step + count) % count);
  const genreNames = (movie: Movie) =>
    (movie.genre_ids ?? [])
      .map((id) => `g${id}`)
      .filter((key) => tg.has(key as "g28"))
      .slice(0, 3)
      .map((key) => tg(key as "g28"));

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("heroLabel")}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start || count < 2) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
      }}
      className="relative h-[78svh] max-h-[860px] min-h-[560px] w-full overflow-hidden bg-background text-foreground md:h-[88vh]"
    >
      {slides.map((movie, index) => {
        const isActive = index === activeIndex;
        const title = getDisplayTitle(movie);
        const backdrop = tmdbImage(movie.backdrop_path);
        const year = getReleaseYear(movie);
        const rating = movie.vote_average ?? 0;
        const genres = genreNames(movie);
        return (
          <div
            key={movie.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${count}`}
            aria-hidden={!isActive}
            className={cn(
              "absolute inset-0 transition-all duration-1000 ease-out motion-reduce:transition-none",
              isActive ? "visible opacity-100" : "pointer-events-none invisible opacity-0",
            )}
          >
            {/* Backdrop with a slow zoom ("Ken Burns") on the active slide */}
            <div className="absolute inset-0 overflow-hidden">
              {backdrop && (
                <Image
                  src={backdrop}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  className={cn(
                    "object-cover object-[65%_center] transition-transform duration-[9000ms] ease-out motion-reduce:transition-none md:object-center",
                    isActive ? "scale-105" : "scale-100",
                  )}
                />
              )}
              {/* Readability: dark at the bottom (phones) and on the left (desktop) */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-background/10" />
              <div className="absolute inset-0 hidden bg-linear-to-r from-background/95 via-background/40 to-transparent md:block" />
              <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-background/70 to-transparent" />
            </div>

            <Container className="relative z-10 flex h-full flex-col justify-end pb-20 md:justify-center md:pb-0">
              <div
                className={cn(
                  "max-w-2xl space-y-4 transition-all delay-200 duration-700 motion-reduce:transition-none md:space-y-5",
                  isActive ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                )}
              >
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-black uppercase tracking-wide text-black shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                    <Flame className="h-3.5 w-3.5" aria-hidden />
                    {movie.rank ? t("heroRank", { rank: movie.rank }) : t("heroBadge")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-bold text-white backdrop-blur-md">
                    <Film className="h-3.5 w-3.5" aria-hidden />
                    {t("heroMovie")}
                  </span>
                  {rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-bold text-white backdrop-blur-md">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                      {rating.toFixed(1)}
                    </span>
                  )}
                  {year && (
                    <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] sm:px-3 sm:text-[11px] font-bold text-white backdrop-blur-md">
                      {year}
                    </span>
                  )}
                </div>

                <h2 className="line-clamp-2 text-4xl leading-[1.02] font-black tracking-tight text-foreground drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] sm:text-5xl lg:text-6xl">
                  {title}
                </h2>

                {genres.length > 0 && (
                  <p className="text-xs font-bold tracking-wide text-brand-bright uppercase">{genres.join(" · ")}</p>
                )}

                <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-foreground/80 sm:text-base md:line-clamp-3 md:text-lg">
                  {movie.overview}
                </p>

                {/* Actions: Watch (main), Trailer, More info */}
                <div className="flex items-center gap-3 pt-1">
                  <Link
                    href={getWatchHref(movie.id, "movie")}
                    tabIndex={isActive ? 0 : -1}
                    className="flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-cyan-500 px-6 py-3.5 text-sm font-black text-black shadow-[0_12px_40px_-10px_rgba(6,182,212,0.8)] transition-colors hover:bg-cyan-400 sm:flex-none sm:px-9 sm:py-4 sm:text-base"
                  >
                    <Play className="h-5 w-5 fill-current" aria-hidden />
                    {t("watch")}
                  </Link>
                  <Link
                    href={getTrailerHref(movie.id, "movie", title)}
                    tabIndex={isActive ? 0 : -1}
                    aria-label={t("trailer")}
                    title={t("trailer")}
                    className="flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:border-cyan-400 hover:text-cyan-300 sm:h-14 sm:w-auto sm:px-6"
                  >
                    <Clapperboard className="h-5 w-5" aria-hidden />
                    <span className="hidden text-sm font-bold sm:inline">{t("trailer")}</span>
                  </Link>
                  <MovieDetails movie={movie}>
                    <button
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      aria-label={t("moreInfo")}
                      title={t("moreInfo")}
                      className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:border-cyan-400 hover:text-cyan-300 sm:h-14 sm:w-auto sm:px-6"
                    >
                      <Info className="h-5 w-5" aria-hidden />
                      <span className="hidden text-sm font-bold sm:inline">{t("moreInfo")}</span>
                    </button>
                  </MovieDetails>
                </div>
              </div>
            </Container>
          </div>
        );
      })}

      {count > 1 && (
        <>
          {/* Slide dots (phones & tablets): left-aligned under the buttons */}
          <Container className="pointer-events-none absolute inset-x-0 bottom-7 z-30 lg:hidden">
            <div className="pointer-events-auto flex items-center gap-2">
              {slides.map((movie, i) => {
                const isActive = activeIndex === i;
                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    aria-label={t("slide", { index: i + 1 })}
                    aria-current={isActive}
                    className="cursor-pointer py-2"
                  >
                    <span
                      className={cn(
                        "relative block h-1.5 overflow-hidden rounded-full transition-all duration-500",
                        isActive ? "w-8 bg-white/25" : "w-2.5 bg-white/30",
                      )}
                    >
                      {isActive && (
                        <span
                          key={`${activeIndex}-${paused}`}
                          className={cn(
                            "absolute inset-0 origin-left bg-cyan-400",
                            !paused && !reducedMotion && "animate-[hero-progress_8s_linear_forwards]",
                          )}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </Container>

          {/* Slide picker with thumbnails (large screens) */}
          <div className="absolute right-8 bottom-10 z-30 hidden gap-3 lg:flex xl:right-12">
            {slides.map((movie, i) => {
              const isActive = activeIndex === i;
              const thumb = tmdbImage(movie.backdrop_path);
              return (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={t("slide", { index: i + 1 })}
                  aria-current={isActive}
                  className={cn(
                    "group relative h-20 w-36 cursor-pointer overflow-hidden rounded-xl border-2 transition-all duration-300",
                    isActive
                      ? "border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.5)]"
                      : "border-white/10 opacity-60 hover:opacity-100",
                  )}
                >
                  {thumb && <Image src={thumb} alt="" fill sizes="144px" className="object-cover" />}
                  <span className="absolute inset-0 bg-linear-to-t from-black/90 to-transparent" />
                  <span className="absolute inset-x-2 bottom-1.5 truncate text-left text-[11px] font-bold text-white">
                    {getDisplayTitle(movie)}
                  </span>
                  {isActive && (
                    <span
                      key={`${activeIndex}-${paused}`}
                      className={cn(
                        "absolute bottom-0 left-0 h-0.5 w-full origin-left bg-cyan-400",
                        !paused && !reducedMotion && "animate-[hero-progress_8s_linear_forwards]",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_15px_#06b6d4]" />
    </section>
  );
}
