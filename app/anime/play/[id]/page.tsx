import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAnimeDetails, getAnimeSeasonEpisodes } from "@/action/get-anime-details.action";
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
  const [anime, t] = await Promise.all([getAnimeDetails(id), getTranslations("player")]);
  return anime ? { title: `${anime.name} · ${t("episodeTag", { season, episode })}` } : {};
}

export default async function AnimePlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  const { season, episode } = parseEpisodeParams(s, e);
  const [anime, episodes] = await Promise.all([getAnimeDetails(id), getAnimeSeasonEpisodes(id, season)]);

  return <EpisodePlayView series={anime} episodes={episodes} season={season} episode={episode} path="anime" />;
}
