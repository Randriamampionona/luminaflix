import type { Metadata } from "next";
import { titleMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import { getMediaInteraction } from "@/action/stream-actions";
import EpisodePlayView, { parseEpisodeParams } from "@/components/media/episode-play-view";
import CommunityWatch, { communityMetadata } from "@/components/community/community-watch";
import { isCommunityId } from "@/lib/community/types";

// Player page: never cached anywhere — rendered fresh on every request, with
// fresh data (no Next.js data cache), and sent with no-store headers (next.config.ts).
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
  // Community upload (com_…): its own player page.
  if (isCommunityId(id)) return communityMetadata(id);
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, t] = await Promise.all([getKDramaDetails(id), getTranslations("player")]);
  if (!drama) return {};
  return titleMetadata({
    kind: "kdrama",
    id,
    title: `${drama.name} · ${t("episodeTag", { season, episode })}`,
    description: drama.overview,
    index: false,
  });
}

export default async function KDramaPlayPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, { s, e }] = await Promise.all([params, searchParams]);
  if (isCommunityId(id)) return <CommunityWatch id={id} route="kdrama" />;
  const { season, episode } = parseEpisodeParams(s, e);
  const [drama, episodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, season)]);
  // Not awaited: streams into the player's action bar.
  const interaction = getMediaInteraction({ mediaId: id, type: "K_DRAMA", season, episode });

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
