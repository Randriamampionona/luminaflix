import type { Metadata } from "next";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

// Same TMDB TV details as K-dramas (the action is generic for any series).
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const show = await getKDramaDetails(id);
  return show ? { title: show.name, description: show.overview?.slice(0, 160) } : {};
}

/** /tv-shows/[id] — series details: seasons, episodes, share. */
export default async function TVShowDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [show, initialEpisodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, 1)]);
  return <SeriesDetailsView series={show} initialEpisodes={initialEpisodes} path="tv-shows" />;
}
