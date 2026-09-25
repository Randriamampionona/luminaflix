import type { Metadata } from "next";
import { getAnimeDetails, getAnimeSeasonEpisodes } from "@/action/get-anime-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const anime = await getAnimeDetails(id);
  return anime ? { title: anime.name, description: anime.overview?.slice(0, 160) } : {};
}

export default async function AnimeDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  // PERF: details and first season load in parallel (were sequential).
  const [anime, initialEpisodes] = await Promise.all([getAnimeDetails(id), getAnimeSeasonEpisodes(id, 1)]);
  return <SeriesDetailsView series={anime} initialEpisodes={initialEpisodes} path="anime" />;
}
