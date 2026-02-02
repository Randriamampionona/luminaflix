"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Star, Play } from "lucide-react";
import { Movie } from "@/typing";
import Link from "next/link";

interface MovieDetailsProps {
  movie: Movie;
  children: React.ReactNode;
  type?: "movie" | "tv" | "anime"; // Added to handle routing
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

  // Dynamic Route Construction
  const baseRoute =
    type === "anime" ? "/anime" : type === "tv" ? "/k-drama" : "/movies";

  const playLink = `${baseRoute}/${movie.id}?fallback=${displayName
    ?.toLocaleLowerCase()
    .replaceAll(" ", "+")}`;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-175 bg-zinc-950/95 border-white/5 text-white backdrop-blur-2xl font-geist rounded-[2rem] overflow-hidden z-100 p-0 border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Poster Section with Play Overlay */}
          <div className="relative group aspect-2/3 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={displayName}
              className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
              <Link
                href={playLink}
                className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-90 transition-all"
              >
                <Play className="w-8 h-8 text-black fill-current ml-1" />
              </Link>
            </div>
          </div>

          {/* Details Content */}
          <div className="flex flex-col justify-between py-4">
            <div>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    Lumina {type === "tv" ? "Series" : "Cinema"} Port
                  </span>
                </div>
                <DialogTitle className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4 line-clamp-3">
                  {displayName}
                  <span className="text-cyan-500 not-italic">.</span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-cyan-400 font-black text-sm bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {movie.vote_average.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 text-zinc-400 font-bold text-xs uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" />
                  {displayDate}
                </div>
              </div>

              <p className="text-zinc-400 h-auto max-h-36 leading-relaxed text-sm mb-8 italic font-medium overflow-y-auto pr-2 custom-scrollbar">
                &ldquo;{movie.overview}&rdquo;
              </p>
            </div>

            <div className="space-y-4">
              <Link
                href={playLink}
                className="flex items-center justify-center gap-3 w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-cyan-500 hover:text-white transition-all shadow-xl group border border-transparent hover:border-white/20"
              >
                <Play className="w-4 h-4 fill-current transition-transform group-hover:scale-110" />
                {type === "tv" ? "Explore Episodes" : "Start Watching"}
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
