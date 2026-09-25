import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getNewAndPopular } from "@/action/get-new-popular.action";
import { MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";

type SearchParams = { page?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("newPopular") };
}

export default async function NewPopularPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";
  const filtered = genre !== "all" || year !== "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.newPopular"),
    getNewAndPopular(page, genre, year),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("subtitle")}
        actions={<AdvancedFilter mediaType="movie" />}
      />
      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/new-popular"
        searchParams={params}
        emptyTitle={filtered ? undefined : t("empty")}
        resetHref={filtered ? "/new-popular" : undefined}
      />
    </PageShell>
  );
}
