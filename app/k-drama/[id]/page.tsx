import {
  getKDramaDetails,
  getSeasonEpisodes,
} from "@/action/get-kdrama-details.action";
import EpisodeExplorer from "@/components/episode-explorer";
import { Star } from "lucide-react";
import Image from "next/image";

export default async function KDramaDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ display_lang?: string }>;
}) {
  const { id } = await params;
  const { display_lang } = await searchParams;
  const drama = await getKDramaDetails(id, display_lang);
  const initialEpisodes = await getSeasonEpisodes(id, 1, display_lang);
  if (!drama)
    return (
      <div className="text-white pt-40 text-center uppercase font-black">
        Signal Lost: Drama not found.
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="relative h-[69vh] w-full">
        <Image
          src={`https://image.tmdb.org/t/p/original${drama.backdrop_path}`}
          alt={drama.name}
          fill
          className="object-cover opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />

        <div className="absolute bottom-10 left-8 md:left-16 pr-8 space-y-4 max-w-4xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
              K-Series
            </span>
            <div className="flex items-center gap-1 text-cyan-400 ml-4 font-bold">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-sm">{drama.vote_average.toFixed(1)}</span>
            </div>
          </div>
          <h1 className="flex flex-col space-y-6 text-5xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
            <span>{drama.name}</span>
            <span className="text-zinc-600 not-italic text-2xl md:text-3xl">
              {drama.original_name}
            </span>
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl line-clamp-3 font-medium italic">
            &ldquo;{drama.overview}&rdquo;
          </p>
        </div>
      </div>

      <div className="px-8 md:px-16 mt-12">
        <EpisodeExplorer
          seriesId={id}
          initialEpisodes={initialEpisodes}
          seasons={drama.seasons}
          path="k-drama"
        />
      </div>
    </div>
  );
}
