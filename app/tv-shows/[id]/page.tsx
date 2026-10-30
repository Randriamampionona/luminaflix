import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import JsonLd from "@/components/seo/json-ld";
import { titleMetadata } from "@/lib/seo";
import { getKDramaDetails, getSeasonEpisodes } from "@/action/get-kdrama-details.action";
import SeriesDetailsView from "@/components/media/series-details-view";

type Params = Promise<{ id: string }>;

// Same TMDB TV details as K-dramas (the action is generic for any series).
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const show = await getKDramaDetails(id);
  if (!show) return {};
  const t = await getTranslations("seo");
  const year = show.first_air_date?.slice(0, 4);
  return titleMetadata({
    kind: "tv",
    id,
    title: t("seriesTitle", { title: show.name, year: year ? ` (${year})` : "" }),
    description: show.overview || t("seriesDescription", { title: show.name }),
    index: true,
  });
}

/** /tv-shows/[id] — series details: seasons, episodes, share. */
export default async function TVShowDetailsPage({ params }: { params: Params }) {
  const { id } = await params;
  const [show, initialEpisodes] = await Promise.all([getKDramaDetails(id), getSeasonEpisodes(id, 1)]);
  return (
    <>
      {show && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "TVSeries",
            name: show.name,
            description: show.overview || undefined,
            image: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : undefined,
            startDate: show.first_air_date || undefined,
            numberOfSeasons: show.number_of_seasons || undefined,
            genre: show.genres?.map((g) => g.name),
          }}
        />
      )}
      <SeriesDetailsView series={show} initialEpisodes={initialEpisodes} path="tv-shows" />
    </>
  );
}
