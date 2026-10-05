import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Await } from "@/components/layout/await";
import { withOriginalTitle } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import AiSearchNotice from "@/components/search/ai-search-notice";
import type { SmartSearchResult } from "@/lib/search/smart-search";

/** Shared anime / K-drama search results page (was two duplicated files). */
export default async function SectionSearchResults({
  query,
  result,
  page,
  mode,
  section,
}: {
  query: string;
  /** smartSearch() promise (not awaited: results stream in). */
  result: Promise<SmartSearchResult>;
  page: number;
  mode: string;
  section: "anime" | "k-drama";
}) {
  const data = result.then((r) => r.data);
  const streamKey = `${query}:${page}:${mode}`;
  const basePath = `/${section}/search/${encodeURIComponent(query)}`;
  const [t, tNav] = await Promise.all([getTranslations("search"), getTranslations("nav")]);
  const sectionLabel = section === "anime" ? tNav("anime") : tNav("kdrama");

  return (
    <PageShell>
      <div className="space-y-8">
        <Link
          href={`/${section}`}
          className="group inline-flex items-center gap-2 text-fg-subtle transition-colors hover:text-brand"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {t("backTo", { section: sectionLabel })}
          </span>
        </Link>
        <PageHeader
          title={t("resultsFor")}
          accent={query}
          meta={
            <StreamedText data={data} streamKey={streamKey}>
              {(d) => t("matches", { count: d.total_results })}
            </StreamedText>
          }
        />
      </div>
      <Suspense key={streamKey} fallback={null}>
        <Await promise={result}>{(r) => <AiSearchNotice ai={r.ai} exactHref={`${basePath}?ai=0`} />}</Await>
      </Suspense>
      <StreamedListing
        data={data}
        streamKey={streamKey}
        transform={withOriginalTitle}
        kind={section === "anime" ? "anime" : "tv"}
        page={page}
        basePath={basePath}
        searchParams={mode === "off" ? { ai: "0" } : undefined}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query })}
      />
    </PageShell>
  );
}