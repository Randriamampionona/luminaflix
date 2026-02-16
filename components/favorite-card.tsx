"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Star,
  ArrowUpRight,
  MonitorPlay,
  BookmarkMinus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleFavorite } from "@/action/stream-actions";

export default function FavoriteCard({ item }: { item: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const getHref = () => {
    if (item.savedType === "MOVIE") return `/movies/${item.id}`;
    const path = item.savedType === "K_DRAMA" ? "k-drama" : "anime";
    return `/${path}/play/${item.id}?s=${item.savedSeason}&e=${item.savedEpisode}`;
  };

  const handleUnfavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // Stop navigation to the play page
    e.stopPropagation();

    startTransition(async () => {
      try {
        await toggleFavorite({
          mediaId: String(item.id),
          type: item.savedType,
          season: item.savedSeason,
          episode: item.savedEpisode,
        });
        router.refresh(); // Refresh server data to remove the card from the list
      } catch (error) {
        console.error("Failed to remove favorite:", error);
      }
    });
  };

  return (
    <Link
      href={getHref()}
      className={`group relative flex items-center gap-6 p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-cyan-500/40 hover:bg-white/5 transition-all duration-500 overflow-hidden ${
        isPending ? "opacity-50 grayscale pointer-events-none" : ""
      }`}
    >
      {/* Dynamic Cyan Glow Effect */}
      <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/15 transition-all duration-500" />

      {/* Media Poster */}
      <div className="relative h-32 w-24 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
        <Image
          src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute bottom-1 right-1">
          <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black uppercase text-white/70 tracking-widest border border-white/5">
            {item.savedType === "MOVIE" ? "Film" : "Series"}
          </div>
        </div>
      </div>

      {/* Content Metadata */}
      <div className="grow min-w-0 py-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none truncate group-hover:text-cyan-400 transition-colors pr-2">
            {item.title}
          </h3>
          <div className="flex items-center gap-3 shrink-0">
            {/* UNFAVORITE BUTTON */}
            <button
              onClick={handleUnfavorite}
              disabled={isPending}
              className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
              title="Remove from Vault"
            >
              <BookmarkMinus
                className={`w-4 h-4 ${isPending ? "animate-pulse" : ""}`}
              />
            </button>
            <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-cyan-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
          </div>
        </div>

        {item.episode_title && (
          <p className="text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider italic mt-1.5 mb-2 truncate">
            {item.episode_title}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 mb-3">
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-cyan-500 text-cyan-500" />
            <span className="text-[11px] font-black tabular-nums">
              {item.vote_average.toFixed(1)}
            </span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {item.release_date?.split("-")[0] || "N/A"}
            </span>
          </div>
        </div>

        {item.savedType !== "MOVIE" && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <MonitorPlay className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-tighter">
              S{item.savedSeason} <span className="text-white/30 mx-1">•</span>{" "}
              E{item.savedEpisode}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
            Vault Entry:{" "}
            {new Date(item.created_date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
