import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getGenreName } from "@/action/get-all-genres.action";
import { getMoviesByGenre } from "@/action/get-movies-by-genre.action";
import { parsePage } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGenreName(id);
  return name ? { title: name } : {};
}

/**
 * PERF: used to call getAllGenres() — one discover request per genre (~20)
 * just to read this genre's name. Now a single cached /genre/movie/list.
 */
export default async function GenrePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const page = parsePage(sp.page);

  const data = getMoviesByGenre(id, page);
  const [t, name] = await Promise.all([getTranslations("pages.genre"), getGenreName(id)]);
  const streamKey = JSON.stringify(sp);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={name ?? t("unknown")}
        meta={
          <StreamedText data={data} streamKey={streamKey}>
            {(d) => t("count", { count: d.total_results })}
          </StreamedText>
        }
      />
      <StreamedListing
        data={data}
        streamKey={streamKey}
        kind="movie"
        page={page}
        basePath={`/genres/${id}`}
        searchParams={sp}
        emptyTitle={t("empty")}
      />
    </PageShell>
  );
}
