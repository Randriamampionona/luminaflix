"use client";

import { Movie } from "@/typing";
import MovieDetails from "./movie-details";

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  return (
    <MovieDetails movie={movie}>
      <div className="relative flex-none group cursor-pointer w-37.5 md:w-50">
        {/* Poster Container */}
        <div className="relative aspect-2/3 rounded-md overflow-hidden bg-zinc-900 border border-white/5">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Language Tag */}
          <div className="absolute hidden group-hover:block top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 uppercase">
            {movie.original_language}
          </div>
        </div>

        {/* Labels below */}
        <div className="mt-3 space-y-1 px-1">
          <h3 className="text-white font-bold text-xs truncate uppercase tracking-tight">
            {movie.title || movie.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <span>{movie.release_date?.split("-")[0]}</span>
            <span>•</span>
            <span className="text-cyan-500 font-bold uppercase">
              {movie.original_language}
            </span>
            <span>•</span>
            <span className="text-white/60">
              {movie.vote_average.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </MovieDetails>
  );
}
