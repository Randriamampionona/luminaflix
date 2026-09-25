import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import { getMediaInteraction } from "@/action/stream-actions";
import EpisodePlayView, { parseEpisodeParams } from "@/components/media/episode-play-view";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ s?: string; e?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, t] = await Promise.all([getKDramaDetails(id), getTranslations("player")]);
  return drama ? { title: `${drama.name} · ${t("episodeTag", { season, episode })}` } : {};
}

export default async function KDramaPlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, episodes, interaction] = await Promise.all([
    getKDramaDetails(id),
    getSeasonEpisodes(id, season),
    getMediaInteraction({ mediaId: id, type: "K_DRAMA", season, episode }),
  ]);

  return (
    <EpisodePlayView
      series={drama}
      episodes={episodes}
      season={season}
      episode={episode}
      interaction={interaction}
      path="k-drama"
    />
  );
}
