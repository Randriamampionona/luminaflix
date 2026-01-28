"use client";

import Link from "next/link";
import { Genre } from "@/typing";

interface GenreCardProps {
  genre: Genre & { count: number; poster: string };
}

export default function GenreCard({ genre }: GenreCardProps) {
  return (
    <Link href={`/search/${genre.name.toLowerCase()}?genre=${genre.id}`}>
      <div className="group relative h-28 bg-zinc-900/40 rounded-md overflow-hidden border border-white/5 transition-all duration-500 hover:bg-cyan-600">
        {/* Text Content: Title and Count */}
        <div className="p-5 h-full flex flex-col justify-center relative z-10">
          <h3 className="text-white font-black text-xl tracking-tight uppercase italic transition-transform duration-300 group-hover:translate-x-1">
            {genre.name}
          </h3>
          <p className="text-[11px] text-zinc-400 group-hover:text-white/90 font-bold mt-1">
            {genre.count.toLocaleString()} movies & tv shows
          </p>
        </div>

        {/* Tilted Image Preview */}
        <div className="absolute -right-2 -bottom-2 w-20 h-28 transition-all duration-500 group-hover:right-2 group-hover:-bottom-4">
          <div className="relative w-full h-full rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-2xl">
            <img
              src={`https://image.tmdb.org/t/p/w200${genre.poster}`}
              alt={genre.name}
              className="w-full h-full object-cover rounded-lg border border-white/10 opacity-50 group-hover:opacity-100 transition-opacity"
            />
            {/* Overlay to blend the image into the card background */}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent group-hover:hidden" />
          </div>
        </div>
      </div>
    </Link>
  );
}
