import {
  getKDramaDetails,
  getSeasonEpisodes,
} from "@/action/get-kdrama-details.action";
import { Play, Calendar, Star, LayoutGrid } from "lucide-react";
import Image from "next/image";

export default async function KDramaDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drama = await getKDramaDetails(id);

  // Defaulting to Season 1 for the initial UI display
  const episodes = await getSeasonEpisodes(id, 1);

  if (!drama)
    return <div className="text-white pt-40 text-center">Drama not found.</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* 1. HERO BACKDROP SECTION */}
      <div className="relative h-[60vh] w-full">
        <Image
          src={`https://image.tmdb.org/t/p/original${drama.backdrop_path}`}
          alt={drama.name}
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <div className="absolute bottom-10 left-8 md:left-16 space-y-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
              K-Series
            </span>
            <div className="flex items-center gap-1 text-cyan-400 ml-4">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-bold">
                {drama.vote_average.toFixed(1)}
              </span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            {drama.name}{" "}
            <span className="text-zinc-500">({drama.original_name})</span>
            <span className="text-cyan-500">.</span>
          </h1>

          <p className="text-zinc-400 text-sm md:text-base max-w-2xl line-clamp-3 font-medium leading-relaxed">
            {drama.overview}
          </p>
        </div>
      </div>

      {/* 2. EPISODE EXPLORER UI */}
      <div className="px-8 md:px-16 mt-12 space-y-10">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase italic tracking-tight">
              Episode Signal
            </h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
              {drama.number_of_seasons} Seasons Detected — Season 01 Active
            </p>
          </div>

          {/* Season Selector (UI Only) */}
          <div className="flex gap-2">
            {drama.seasons.map(
              (s: any) =>
                s.season_number > 0 && (
                  <button
                    key={s.id}
                    className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-[10px] font-black hover:bg-white hover:text-black transition-all"
                  >
                    S{s.season_number}
                  </button>
                ),
            )}
          </div>
        </div>

        {/* Episode Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {episodes.map((ep: any) => (
            <div
              key={ep.id}
              className="group relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all cursor-pointer"
            >
              <Image
                src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
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
                    {ep.air_date?.split("-")[0]}
                  </span>
                </div>
                <h3 className="text-sm font-bold truncate uppercase tracking-tighter">
                  {ep.name}
                </h3>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_#06b6d4]">
                  <Play className="w-5 h-5 fill-current ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
