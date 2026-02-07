"use client";

import { useState } from "react";
import { Loader2, LayoutGrid, ChevronDown, Plus } from "lucide-react";
import EpisodeCard from "./episode-card";
import { getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EpisodeExplorer({
  seriesId,
  initialEpisodes,
  seasons,
  path,
}: any) {
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [isLoading, setIsLoading] = useState(false);

  // Filter seasons (exclude season 0)
  const validSeasons = seasons.filter((s: any) => s.season_number > 0);
  const visibleSeasons = validSeasons.slice(0, 3);
  const overflowSeasons = validSeasons.slice(3);

  const handleSeasonChange = async (num: number) => {
    if (num === activeSeason || isLoading) return;
    setIsLoading(true);
    setActiveSeason(num);
    const data = await getSeasonEpisodes(seriesId, num);
    setEpisodes(data);
    setIsLoading(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-6 gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
            Episode Signal
          </h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Season {activeSeason.toString().padStart(2, "0")} Active
          </p>
        </div>

        {/* SEASON SELECTOR GRID */}
        <div className="flex items-center gap-2">
          {visibleSeasons.map((s: any) => (
            <button
              key={s.id}
              onClick={() => handleSeasonChange(s.season_number)}
              className={`h-10 px-5 rounded-xl text-[10px] font-black transition-all duration-500 border uppercase tracking-widest ${
                activeSeason === s.season_number
                  ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  : "bg-zinc-900/40 border-white/5 text-zinc-500 hover:text-white hover:border-white/20"
              }`}
            >
              S{s.season_number}
            </button>
          ))}

          {/* OVERFLOW DROPDOWN */}
          {overflowSeasons.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-10 px-4 flex items-center gap-2 bg-zinc-900/40 border border-white/5 rounded-xl text-[10px] font-black text-zinc-400 hover:border-cyan-500/30 hover:text-white transition-all outline-none">
                <Plus className="w-3 h-3" />
                <span>MORE</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#050505] border-white/10 rounded-2xl p-1 backdrop-blur-3xl shadow-2xl min-w-30 max-h-64"
              >
                {overflowSeasons.map((s: any) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => handleSeasonChange(s.season_number)}
                    className={`rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all mb-1 last:mb-0 ${
                      activeSeason === s.season_number
                        ? "bg-white text-black"
                        : "text-zinc-400 focus:bg-white focus:text-black"
                    }`}
                  >
                    Season {s.season_number}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-cyan-500/20 animate-pulse" />
          </div>
        </div>
      ) : episodes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
          {episodes.map((ep: any) => (
            <EpisodeCard
              key={ep.id}
              ep={ep}
              seriesId={seriesId}
              seasonNumber={activeSeason}
              path={path}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/5 rounded-[3rem] bg-zinc-900/5 backdrop-blur-sm">
          <LayoutGrid className="w-8 h-8 text-zinc-800 mb-4" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
            Signal Lost
          </h3>
          <p className="text-[8px] font-bold text-zinc-700 uppercase mt-2">
            No active data for Season {activeSeason}
          </p>
        </div>
      )}
    </div>
  );
}
