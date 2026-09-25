import type { Metadata } from "next";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const drama = await getKDramaDetails(id);
  return drama ? { title: drama.name, description: drama.overview?.slice(0, 160) } : {};
}

export default async function KDramaDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [drama, initialEpisodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, 1)]);
  return <SeriesDetailsView series={drama} initialEpisodes={initialEpisodes} path="k-drama" />;
}
