"use client";

import { useEffect, useState, useCallback } from "react";
import { Play, Info } from "lucide-react";
import CustomLink from "./custom-link";
import MovieDetails from "./movie-details";
import Image from "next/image";

export default function HeroSlider({
  trendingMovies,
}: {
  trendingMovies: any[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = trendingMovies?.slice(0, 3) || [];

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(nextSlide, 8000);
    return () => clearInterval(timer);
  }, [nextSlide, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative h-[90vh] md:h-screen w-full overflow-hidden bg-black">
      {slides.map((movie, index) => (
        <div
          key={movie.id}
          className={`absolute inset-0 transition-all duration-1500 ease-in-out ${
            index === activeIndex
              ? "opacity-100 scale-100 visible"
              : "opacity-0 scale-110 invisible pointer-events-none"
          }`}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              fill
              priority={index === 0}
              className="object-cover opacity-50"
            />
            {/* Gradients to blend into your UI */}
            <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 px-8 md:px-16 h-full flex flex-col justify-center max-w-4xl">
            <div
              className={`space-y-6 transition-all duration-1000 delay-300 ${
                index === activeIndex
                  ? "translate-y-0 opacity-100"
                  : "translate-y-12 opacity-0"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="bg-cyan-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-tighter shadow-[0_0_15px_#06b6d4]">
                  TRENDING NOW
                </span>
                <span className="text-white/60 text-xs tracking-[0.2em] uppercase font-bold">
                  Luminaflix Originals
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic drop-shadow-2xl line-clamp-2">
                {movie.title || movie.name}
                <span className="text-cyan-500 not-italic">.</span>
              </h1>

              <p className="text-base md:text-lg text-white/70 line-clamp-3 leading-relaxed max-w-xl font-medium">
                {movie.overview}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <CustomLink href={`/movies/${movie.id}`}>
                  <button className="group flex items-center gap-3 bg-white text-black px-8 md:px-10 py-3 md:py-4 rounded-full font-black uppercase text-xs md:text-sm hover:bg-cyan-500 hover:text-white transition-all duration-500 cursor-pointer">
                    <Play className="w-5 h-5 fill-current" />
                    Play Now
                  </button>
                </CustomLink>

                <MovieDetails movie={movie}>
                  <button className="group flex items-center gap-3 bg-white/10 text-white px-8 md:px-10 py-3 md:py-4 rounded-full font-black uppercase text-xs md:text-sm backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
                    <Info className="w-5 h-5 text-cyan-400" />
                    More Info
                  </button>
                </MovieDetails>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* --- PRO MODERN PROGRESS NAVIGATION --- */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
        {slides.map((_, i) => {
          const isActive = activeIndex === i;
          return (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="group relative flex flex-col items-center cursor-pointer transition-all duration-500"
            >
              {/* The Dynamic Bar */}
              <div
                className={`h-1.5 rounded-md overflow-hidden relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  isActive
                    ? "w-12 bg-white/20"
                    : "w-6 bg-white/5 group-hover:bg-white/10"
                }`}
              >
                {/* Animated Fill Layer */}
                {isActive && (
                  <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)] origin-left animate-[hero-progress_8s_linear_forwards]" />
                )}
              </div>

              {/* Subtle hit area helper for mobile */}
              <div className="absolute -inset-2 block md:hidden" />
            </button>
          );
        })}
      </div>

      {/* Decorative Bottom Line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-cyan-500/40 to-transparent shadow-[0_0_15px_#06b6d4]" />
    </section>
  );
}
