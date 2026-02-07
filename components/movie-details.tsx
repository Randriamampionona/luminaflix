"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Star, Play, Film } from "lucide-react";
import { Movie } from "@/typing";
import Link from "next/link";
import CustomLink from "./custom-link";

interface MovieDetailsProps {
  movie: Movie;
  children: React.ReactNode;
  type?: "movie" | "tv" | "anime";
}

export default function MovieDetails({
  movie,
  children,
  type = "movie",
}: MovieDetailsProps) {
  const displayName = movie.title || movie.name;
  const displayDate = (movie.release_date || movie.first_air_date)?.split(
    "-",
  )[0];

  const baseRoute =
    type === "anime" ? "/anime" : type === "tv" ? "/k-drama" : "/movies";

  const playLink = `${baseRoute}/${movie.id}?fallback=${displayName
    ?.toLocaleLowerCase()
    .replaceAll(" ", "+")}`;

  const trailerLink = `/trailer/${movie.id}?lang=fr&type=${type}&fallback=${displayName
    ?.toLocaleLowerCase()
    .replaceAll(" ", "+")}`;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-175 bg-zinc-950/95 text-white backdrop-blur-2xl font-geist rounded-[2rem] overflow-hidden z-100 p-0 border-white/5">
        {/* Main Wrapper: Relative so children can absolute position on mobile */}
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 p-6 min-h-137.5 md:min-h-0">
          {/* 1. Poster Section: Background on Mobile / Column on Desktop */}
          <div className="absolute inset-0 md:relative md:inset-auto group aspect-2/3 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <img
              src={`https://image.tmdb.org/t/p/w780${movie.poster_path}`}
              alt={displayName}
              className="object-cover w-full h-full transition-transform duration-700 md:group-hover:scale-110"
            />

            {/* DARKER CINEMATIC OVERLAY (MOBILE ONLY) */}
            {/* Using pure black with a higher "via" stop for maximum contrast */}
            <div className="absolute inset-0 bg-linear-to-t from-black via-black/90 to-black/20 md:hidden" />

            {/* Desktop Play Overlay (Visible only on MD+) */}
            <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center backdrop-blur-[2px]">
              <CustomLink
                href={playLink}
                className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-90 transition-all"
              >
                <Play className="w-8 h-8 text-black fill-current ml-1" />
              </CustomLink>
            </div>
          </div>

          {/* 2. Details Content: Floats over poster on mobile */}
          <div className="relative flex flex-col justify-end md:justify-between py-4 z-10">
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-300 md:text-zinc-500">
                    Lumina{" "}
                    {type === "tv"
                      ? "Series"
                      : type === "anime"
                        ? "Anime"
                        : "Cinema"}{" "}
                    Port
                  </span>
                </div>
                <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4 line-clamp-3">
                  {displayName}
                  <span className="text-cyan-500 not-italic">.</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-cyan-400 font-black text-sm bg-cyan-400/20 md:bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 backdrop-blur-md">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {movie.vote_average.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 text-zinc-200 md:text-zinc-400 font-bold text-xs uppercase tracking-widest drop-shadow-md">
                  <Calendar className="w-3.5 h-3.5" />
                  {displayDate}
                </div>
              </div>

              <p className="text-zinc-200 md:text-zinc-400 h-auto max-h-36 leading-relaxed text-sm mb-8 italic font-medium overflow-y-auto pr-2 custom-scrollbar drop-shadow-md">
                &ldquo;{movie.overview}&rdquo;
              </p>
            </div>

            {/* Buttons Stack */}
            <div className="space-y-4">
              <CustomLink
                href={trailerLink}
                className="flex items-center justify-center gap-3 w-full bg-zinc-900/80 md:bg-zinc-900 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all active:scale-95 backdrop-blur-md"
              >
                <Film className="w-4 h-4 text-cyan-500" />
                Watch Trailer
              </CustomLink>
              <CustomLink
                href={playLink}
                className="flex items-center justify-center gap-3 w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-all shadow-xl group border border-transparent hover:border-white/20"
              >
                <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                {type === "tv" || type === "anime"
                  ? "Explore Episodes"
                  : "Start Watching"}
              </CustomLink>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
