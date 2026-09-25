import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withOriginalTitle } from "@/components/layout/media-listing";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import type { TMDBResponse } from "@/typing";

/** Shared anime / K-drama search results page (was two duplicated files). */
export default async function SectionSearchResults({
  query,
  data,
  page,
  section,
}: {
  query: string;
  data: Promise<TMDBResponse>;
  page: number;
  section: "anime" | "k-drama";
}) {
  const [t, tNav] = await Promise.all([getTranslations("search"), getTranslations("nav")]);
  const sectionLabel = section === "anime" ? tNav("anime") : tNav("kdrama");

  return (
    <PageShell>
      <div className="space-y-8">
        <Link
          href={`/${section}`}
          className="group inline-flex items-center gap-2 text-zinc-500 transition-colors hover:text-cyan-500"
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
            <StreamedText data={data} streamKey={String(page)}>
              {(d) => t("matches", { count: d.total_results })}
            </StreamedText>
          }
        />
      </div>
      <StreamedListing
        data={data}
        streamKey={String(page)}
        transform={withOriginalTitle}
        kind={section === "anime" ? "anime" : "tv"}
        page={page}
        basePath={`/${section}/search/${encodeURIComponent(query)}`}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query })}
      />
    </PageShell>
  );
}
