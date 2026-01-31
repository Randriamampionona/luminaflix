import {
  getAnimeDetails,
  getAnimeSeasonEpisodes,
} from "@/action/get-anime-details.action";
import EpisodeExplorer from "@/components/episode-explorer";
import { Star } from "lucide-react";
import Image from "next/image";

export default async function AnimeDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // These actions should mirror your getKDramaDetails but fetch from TMDB /tv endpoint
  const anime = await getAnimeDetails(id);
  const initialEpisodes = await getAnimeSeasonEpisodes(id, 1);

  if (!anime)
    return (
      <div className="text-white pt-40 text-center uppercase font-black">
        Signal Lost: Anime data not found.
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero Backdrop Section */}
      <div className="relative h-[69vh] w-full">
        <Image
          src={`https://image.tmdb.org/t/p/original${anime.backdrop_path}`}
          alt={anime.name}
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <div className="absolute bottom-10 left-8 md:left-16 space-y-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              Anime Series
            </span>
            <div className="flex items-center gap-1 text-cyan-400 ml-4 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm">{anime.vote_average.toFixed(1)}</span>
            </div>
          </div>

          <h1 className="flex flex-col space-y-6 text-5xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
            <span>{anime.name}</span>
            <span className="text-zinc-600 not-italic text-2xl md:text-3xl">
              {anime.original_name}
            </span>
          </h1>

          <p className="text-zinc-400 text-sm md:text-base max-w-2xl line-clamp-3 font-medium italic leading-relaxed">
            &ldquo;{anime.overview}&rdquo;
          </p>
        </div>
      </div>

      {/* Episode / Season Section */}
      <div className="px-8 md:px-16 mt-12">
        <EpisodeExplorer
          seriesId={id}
          initialEpisodes={initialEpisodes}
          seasons={anime.seasons}
          path="anime"
        />
      </div>
    </div>
  );
}
