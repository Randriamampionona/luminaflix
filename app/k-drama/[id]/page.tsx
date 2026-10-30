import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import JsonLd from "@/components/seo/json-ld";
import { titleMetadata } from "@/lib/seo";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const drama = await getKDramaDetails(id);
  if (!drama) return {};
  const t = await getTranslations("seo");
  const year = drama.first_air_date?.slice(0, 4);
  return titleMetadata({
    kind: "kdrama",
    id,
    title: t("seriesTitle", { title: drama.name, year: year ? ` (${year})` : "" }),
    description: drama.overview || t("seriesDescription", { title: drama.name }),
    index: true,
  });
}

export default async function KDramaDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [drama, initialEpisodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, 1)]);
  return (
    <>
      {drama && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: drama.name,
            description: drama.overview || undefined,
            image: drama.poster_path ? `https://image.tmdb.org/t/p/w500${drama.poster_path}` : undefined,
            startDate: drama.first_air_date || undefined,
            numberOfSeasons: drama.number_of_seasons || undefined,
            genre: drama.genres?.map((g) => g.name),
          }}
        />
      )}
      <SeriesDetailsView series={drama} initialEpisodes={initialEpisodes} path="k-drama" />
    </>
  );
}
