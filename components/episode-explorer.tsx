"use client";

import { useState } from "react";
import { Loader2, LayoutGrid } from "lucide-react";
import EpisodeCard from "./episode-card";
import { getSeasonEpisodes } from "@/action/get-kdrama-details.action";

export default function EpisodeExplorer({
  seriesId,
  initialEpisodes,
  seasons,
}: any) {
  const [activeSeason, setActiveSeason] = useState(1);
  const [episodes, setEpisodes] = useState(initialEpisodes);
  const [isLoading, setIsLoading] = useState(false);

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
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
            Season {activeSeason.toString().padStart(2, "0")} Active
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {seasons.map(
            (s: any) =>
              s.season_number > 0 && (
                <button
                  key={s.id}
                  onClick={() => handleSeasonChange(s.season_number)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                    activeSeason === s.season_number
                      ? "bg-cyan-500 border-cyan-500 text-black shadow-[0_0_15px_#06b6d4]"
                      : "bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  S{s.season_number}
                </button>
              )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      ) : episodes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {episodes.map((ep: any) => (
            <EpisodeCard
              key={ep.id}
              ep={ep}
              seriesId={seriesId}
              seasonNumber={activeSeason}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/5 rounded-[2rem] bg-zinc-900/10">
          <LayoutGrid className="w-8 h-8 text-zinc-800 mb-4" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">
            No Episodes Found
          </h3>
          <p className="text-[9px] font-bold text-zinc-600 uppercase mt-2">
            Season {activeSeason} content is currently offline.
          </p>
        </div>
      )}
    </div>
  );
}
