"use client";

import { Movie } from "@/typing";
import { Star, Play } from "lucide-react";
import MovieDetails from "./movie-details";

interface FeaturedBannerProps {
  movie: Movie;
}

export default function FeaturedBanner({ movie }: FeaturedBannerProps) {
  return (
    <div className="px-8 md:px-16 py-10">
      <div className="relative w-full h-75 md:h-100 rounded-xl overflow-hidden group border border-white/10">
        {/* Background Image */}
        <img
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          alt={movie.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/60 to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-center p-8 md:p-12 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-cyan-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-tighter uppercase">
              Coup de coeur
            </span>
            <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
              <Star className="w-3 h-3 fill-current" />
              {movie.vote_average.toFixed(1)} Rating
            </div>
          </div>

          <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
            {movie.title}
            <span className="text-cyan-500 not-italic">.</span>
          </h2>

          <p className="text-zinc-300 text-sm md:text-base line-clamp-2 max-w-lg leading-relaxed">
            {movie.overview}
          </p>

          <div className="flex items-center gap-4 pt-2">
            <MovieDetails movie={movie}>
              <button className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold text-xs uppercase hover:bg-cyan-500 hover:text-white transition-all shadow-lg">
                <Play className="w-4 h-4 fill-current" />
                View Details
              </button>
            </MovieDetails>
          </div>
        </div>
      </div>
    </div>
  );
}
