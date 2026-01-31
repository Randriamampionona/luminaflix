"use client";

import Image from "next/image";
import { Play, Calendar } from "lucide-react";
import Link from "next/link";

interface EpisodeCardProps {
  ep: any;
  seriesId: string; // Added this
  seasonNumber: number; // Added this
}

export default function EpisodeCard({
  ep,
  seriesId,
  seasonNumber,
}: EpisodeCardProps) {
  return (
    <div className="group relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer">
      <Image
        src={
          ep.still_path
            ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
            : "https://placehold.co/600x400/111/333?text=No+Preview"
        }
        alt={ep.name}
        fill
        className="object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />

      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
            EP {ep.episode_number}
          </span>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />{" "}
            {ep.air_date?.split("-")[0] || "TBA"}
          </span>
        </div>
        <h3 className="text-sm font-bold truncate uppercase tracking-tighter">
          {ep.name}
        </h3>
      </div>

      {/* Now these variables are accessible via props */}
      <Link
        href={`/k-drama/play/${seriesId}?s=${seasonNumber}&e=${ep.episode_number}`}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_#06b6d4]">
            <Play className="w-5 h-5 fill-current ml-1" />
          </div>
        </div>
      </Link>
    </div>
  );
}
