import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSearchResults } from "@/action/get-search-results.action";
import { MediaListing } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function SearchPage({ params }: { params: Params }) {
  const { query } = await params;
  const decodedQuery = safeDecode(query);
  const [t, results] = await Promise.all([getTranslations("search"), getSearchResults(decodedQuery)]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("resultsEyebrow")}
        title={`“${decodedQuery}”`}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900/40 px-4 py-2">
            <Sparkles className="h-3 w-3 text-cyan-500" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {t("matches", { count: results.length })}
            </span>
          </span>
        }
      />
      {/* BUG FIX: multi-search mixes movies and series; each card now routes
          to the right section instead of always /movies/<id>. */}
      <MediaListing
        items={results}
        kind="auto"
        page={1}
        totalPages={1}
        basePath={`/search/${encodeURIComponent(decodedQuery)}`}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query: decodedQuery })}
      />
    </PageShell>
  );
}
