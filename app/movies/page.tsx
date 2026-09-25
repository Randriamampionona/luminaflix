import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllMovies } from "@/action/get-all-movies.action";
import { ControlDivider, parsePage } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
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

  const t = await getTranslations("pages.movies");
  // Not awaited: the header renders now, the results stream in.
  const data = getAllMovies(page, sort, genre, year, "movie");
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
          <>
            <AdvancedFilter mediaType="movie" />
            <ControlDivider />
            <SortDropdown mediaType="movie" />
          </>
        }
      />
      <StreamedListing
        data={data}
        streamKey={streamKey}
        kind="movie"
        page={page}
        basePath="/movies"
        searchParams={params}
        resetHref="/movies"
      />
    </PageShell>
  );
}
