import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllAnime } from "@/action/get-all-anime.action";
import { parsePage, withOriginalTitle } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import SectionSearch from "@/components/section-search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("anime") };
}

export default async function AnimePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = parsePage(params.page);

  const [t, tSearch] = await Promise.all([getTranslations("pages.anime"), getTranslations("search")]);
  const data = getAllAnime(page);
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
            basePath="/anime/search"
            placeholder={tSearch("animePlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <StreamedListing
        data={data}
        streamKey={streamKey}
        transform={withOriginalTitle}
        kind="anime"
        page={page}
        basePath="/anime"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
