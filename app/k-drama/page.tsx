import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllKDramas } from "@/action/get-all-kdramas.action";
import { parsePage, withOriginalTitle } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
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

  const [t, tSearch] = await Promise.all([getTranslations("pages.kdrama"), getTranslations("search")]);
  const data = getAllKDramas(page);
  const streamKey = JSON.stringify(params);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={
          <StreamedText data={data} streamKey={streamKey}>
            {(d) => t("count", { count: d.total_results })}
          </StreamedText>
        }
        actions={
          <SectionSearch
            basePath="/k-drama/search"
            placeholder={tSearch("kdramaPlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <StreamedListing
        data={data}
        streamKey={streamKey}
        transform={withOriginalTitle}
        kind="tv"
        page={page}
        basePath="/k-drama"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
