import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllKDramas } from "@/action/get-all-kdramas.action";
import { MediaListing, parsePage, withOriginalTitle } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import SectionSearch from "@/components/section-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("kdrama") };
}

export default async function KDramaPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parsePage(params.page);

  const [t, tSearch, data] = await Promise.all([
    getTranslations("pages.kdrama"),
    getTranslations("search"),
    getAllKDramas(page),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <SectionSearch
            basePath="/k-drama/search"
            placeholder={tSearch("kdramaPlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <MediaListing
        items={data.results.map(withOriginalTitle)}
        kind="tv"
        page={page}
        totalPages={data.total_pages}
        basePath="/k-drama"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
