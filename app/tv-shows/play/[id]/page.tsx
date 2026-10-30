import type { Metadata } from "next";
import { titleMetadata } from "@/lib/seo";
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
  const [show, t] = await Promise.all([getKDramaDetails(id), getTranslations("player")]);
  if (!show) return {};
  return titleMetadata({
    kind: "tv",
    id,
    title: `${show.name} · ${t("episodeTag", { season, episode })}`,
    description: show.overview,
    index: false,
  });
}

/** /tv-shows/play/[id]?s=&e= — episode player of a TV show. */
export default async function TVShowPlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [show, episodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, season)]);
  // Not awaited: streams into the player's action bar.
  const interaction = getMediaInteraction({ mediaId: id, type: "TV_SHOW", season, episode });

  return (
    <EpisodePlayView
      series={show}
      episodes={episodes}
      season={season}
      episode={episode}
      interaction={interaction}
      path="tv-shows"
    />
  );
}
