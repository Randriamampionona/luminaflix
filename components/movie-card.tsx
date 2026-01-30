"use client";

import { Movie } from "@/typing";
import MovieDetails from "./movie-details";

interface MovieCardProps {
  movie: Movie;
  type?: "movie" | "tv"; // Added type prop
}

export default function MovieCard({ movie, type = "movie" }: MovieCardProps) {
  // TMDB uses 'name' for TV and 'title' for Movies
  const displayName = movie.title || movie.name;
  const displayDate = (movie.release_date || movie.first_air_date)?.split(
    "-",
  )[0];

  return (
    <MovieDetails movie={movie} type={type}>
      <div className="relative flex-none group cursor-pointer w-full">
        {/* Poster Container */}
        <div className="relative aspect-2/3 rounded-md overflow-hidden bg-zinc-900 border border-white/5 shadow-lg">
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={displayName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Quality/Type Tag */}
          <div className="absolute top-2 right-2 bg-cyan-500 px-2 py-0.5 rounded text-[8px] font-black text-black uppercase tracking-tighter">
            {type === "tv" ? "Series" : "4K"}
          </div>

          {/* Language Tag */}
          <div className="absolute hidden group-hover:block top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white border border-white/10 uppercase">
            {movie.original_language}
          </div>
        </div>

        {/* Labels below */}
        <div className="mt-3 space-y-1 px-1">
          <h3 className="text-white font-bold text-xs truncate uppercase tracking-tight group-hover:text-cyan-400 transition-colors">
            {displayName}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <span>{displayDate}</span>
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
