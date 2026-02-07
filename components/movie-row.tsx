"use client";

import { useRef } from "react";
import MovieCard from "./movie-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Movie } from "@/typing";

interface MovieRowProps {
  title: string;
  movies: Movie[];
}

export default function MovieRow({ title, movies }: MovieRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth
          : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  return (
    <div className="py-6 space-y-4 overflow-hidden">
      {/* Header with Title and Buttons */}
      <div className="flex items-center justify-between mx-8 md:mx-16">
        <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tighter">
          {title}
          <span className="text-cyan-500">.</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            className="p-2 rounded-full bg-zinc-900 border border-white/5 text-white hover:bg-cyan-500 hover:text-black transition-all"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-2 rounded-full bg-zinc-900 border border-white/5 text-white hover:bg-cyan-500 hover:text-black transition-all"
            aria-label="Scroll Right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* The Scrollable Row - Updated for Mobile Swipe */}
      <div
        ref={rowRef}
        className="flex overflow-x-auto scroll-smooth space-x-4 mx-8 md:mx-16 pb-4 scrollbar-hide touch-pan-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </div>
  );
}
