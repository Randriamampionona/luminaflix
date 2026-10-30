import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import JsonLd from "@/components/seo/json-ld";
import { titleMetadata } from "@/lib/seo";
import { getAnimeDetails, getAnimeSeasonEpisodes } from "@/action/get-anime-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const anime = await getAnimeDetails(id);
  if (!anime) return {};
  const t = await getTranslations("seo");
  const year = anime.first_air_date?.slice(0, 4);
  return titleMetadata({
    kind: "anime",
    id,
    title: t("seriesTitle", { title: anime.name, year: year ? ` (${year})` : "" }),
    description: anime.overview || t("seriesDescription", { title: anime.name }),
    index: true,
  });
}

export default async function AnimeDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  // PERF: details and first season load in parallel (were sequential).
  const [anime, initialEpisodes] = await Promise.all([getAnimeDetails(id), getAnimeSeasonEpisodes(id, 1)]);
  return (
    <>
      {anime && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: anime.name,
            description: anime.overview || undefined,
            image: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : undefined,
            startDate: anime.first_air_date || undefined,
            numberOfSeasons: anime.number_of_seasons || undefined,
            genre: anime.genres?.map((g) => g.name),
          }}
        />
      )}
      <SeriesDetailsView series={anime} initialEpisodes={initialEpisodes} path="anime" />
    </>
  );
}
