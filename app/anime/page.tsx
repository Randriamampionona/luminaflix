import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllAnime } from "@/action/get-all-anime.action";
import { MediaListing, parsePage, withOriginalTitle } from "@/components/layout/media-listing";
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

  const [t, tSearch, data] = await Promise.all([
    getTranslations("pages.anime"),
    getTranslations("search"),
    getAllAnime(page),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <SectionSearch
            basePath="/anime/search"
            placeholder={tSearch("animePlaceholder")}
            submitLabel={tSearch("submit")}
          />
        }
      />
      <MediaListing
        items={data.results.map(withOriginalTitle)}
        kind="anime"
        page={page}
        totalPages={data.total_pages}
        basePath="/anime"
        searchParams={params}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
