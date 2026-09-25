import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllTVShows } from "@/action/get-all-tv.action";
import { ControlDivider, MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { resolveSort } from "@/lib/filters";

type SearchParams = { page?: string; sort?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("tvShows") };
}

/**
 * BUG FIX: this page used movie genres/sorts (filters silently did nothing)
 * and its cards opened /movies/<tvId>, i.e. the wrong title.
 */
export default async function TVShowsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "tv");
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.tvShows"),
    getAllTVShows(page, sort, genre, year),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <>
            <AdvancedFilter mediaType="tv" />
            <ControlDivider />
            <SortDropdown mediaType="tv" />
          </>
        }
      />
      <MediaListing
        items={data.results}
        kind="tv"
        page={page}
        totalPages={data.total_pages}
        basePath="/tv-shows"
        searchParams={params}
        resetHref="/tv-shows"
      />
    </PageShell>
  );
}
