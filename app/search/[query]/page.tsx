import SearchCollections from "@/components/collections/search-collections";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Await } from "@/components/layout/await";
import { parsePage } from "@/components/layout/media-listing";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { StreamedListing, StreamedText } from "@/components/layout/streamed-listing";
import Link from "next/link";
import AiSearchNotice from "@/components/search/ai-search-notice";
import { SEARCH_SCOPES, toSearchScope, type SearchScopeKey } from "@/lib/search/scopes";
import SearchQueryTitle from "@/components/search/search-query-title";
import { cn } from "@/lib/utils";
import { safeDecode } from "@/lib/media";
import { parseSmartMode, smartSearch } from "@/lib/search/smart-search";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string; ai?: string; type?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decodedQuery = safeDecode(query);
  const page = parsePage(sp.page);
  const mode = parseSmartMode(sp.ai);
  const scope = toSearchScope(sp.type);
  const t = await getTranslations("search");

  // Not awaited: the header renders now, results stream in.
  const result = smartSearch({ query: decodedQuery, scope, page, mode });
  const data = result.then((r) => r.data);
  const streamKey = `${decodedQuery}:${page}:${mode}:${scope}`;
  // Section tabs keep the AI setting.
  const scopeHref = (key: SearchScopeKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("type", key);
    if (sp.ai) params.set("ai", sp.ai);
    const qs = params.toString();
    return `/search/${encodeURIComponent(decodedQuery)}${qs ? `?${qs}` : ""}`;
  };
  const basePath = `/search/${encodeURIComponent(decodedQuery)}`;

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("resultsEyebrow")}
        title={<SearchQueryTitle query={decodedQuery} scope={scope} aiOff={mode === "off"} />}
        actions={
          <span className="flex items-center gap-2 rounded-full border border-line bg-elevated/40 px-4 py-2">
            <Sparkles className="h-3 w-3 text-brand" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">
              <StreamedText data={data} streamKey={streamKey}>
                {(d) => t(d.approximate_total ? "matchesApprox" : "matches", { count: d.total_results })}
              </StreamedText>
            </span>
          </span>
        }
      />
      {/* Sections: all, movies, series, K-drama, anime */}
      <nav aria-label={t("scopes.label")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {SEARCH_SCOPES.map((key) => (
          <Link
            key={key}
            href={scopeHref(key)}
            aria-current={scope === key ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-colors",
              scope === key
                ? "border-cyan-500 bg-cyan-500 text-black"
                : "border-line-strong bg-tint text-fg-muted hover:border-cyan-500/50 hover:text-foreground",
            )}
          >
            {t(`scopes.${key}`)}
          </Link>
        ))}
      </nav>
      {page === 1 && scope === "all" && (
        <Suspense key={`collections:${decodedQuery}`} fallback={null}>
          <SearchCollections query={decodedQuery} />
        </Suspense>
      )}
      <Suspense key={streamKey} fallback={null}>
        <Await promise={result}>{(r) => <AiSearchNotice ai={r.ai} exactHref={`${basePath}?ai=0`} />}</Await>
      </Suspense>
      {/* Multi-search mixes movies and series; each card routes to the right section. */}
      <StreamedListing
        data={data}
        streamKey={streamKey}
        kind="auto"
        page={page}
        basePath={basePath}
        searchParams={sp}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyBody", { query: decodedQuery })}
      />
    </PageShell>
  );
}