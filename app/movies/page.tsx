import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllMovies } from "@/action/get-all-movies.action";
import { ControlDivider, MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { resolveSort } from "@/lib/filters";

type SearchParams = { page?: string; sort?: string; genre?: string; year?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("movies") };
}

export default async function MoviesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "movie");
  const genre = params.genre ?? "all";
  const year = params.year ?? "all";

  const [t, data] = await Promise.all([
    getTranslations("pages.movies"),
    getAllMovies(page, sort, genre, year, "movie"),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
        actions={
          <>
            <AdvancedFilter mediaType="movie" />
            <ControlDivider />
            <SortDropdown mediaType="movie" />
          </>
        }
      />
      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/movies"
        searchParams={params}
        resetHref="/movies"
      />
    </PageShell>
  );
}
