import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSearchResults } from "@/action/get-search-results.action";
import { parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decodedQuery = safeDecode(query);
  const page = parsePage(sp.page);
  const t = await getTranslations("search");

  // Not awaited: the header renders now, results stream in (and a new page
  // shows the grid skeleton immediately).
  const data = getSearchResults(decodedQuery, page);
  const streamKey = `${decodedQuery}:${page}`;

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("resultsEyebrow")}
        title={`“${decodedQuery}”`}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-line bg-elevated/40 px-4 py-2">
            <Sparkles className="h-3 w-3 text-brand" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">
              <StreamedText data={data} streamKey={streamKey}>
                {(d) => t("matches", { count: d.total_results })}
              </StreamedText>
            </span>
          </span>
        }
      />
      {/* Multi-search mixes movies and series; each card routes to the right section. */}
      <StreamedListing
        data={data}
        streamKey={streamKey}
        kind="auto"
        page={page}
        basePath={`/search/${encodeURIComponent(decodedQuery)}`}
        searchParams={sp}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query: decodedQuery })}
      />
    </PageShell>
  );
}
