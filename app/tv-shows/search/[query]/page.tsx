import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { parsePage } from "@/components/layout/media-listing";
import SectionSearchResults from "@/components/media/section-search-results";
import { safeDecode } from "@/lib/media";
import { parseSmartMode, smartSearch } from "@/lib/search/smart-search";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string; ai?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

/** /tv-shows/search/[query] — series of any country (anime excluded), AI search included. */
export default async function TVShowSearchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decoded = safeDecode(query);
  const page = parsePage(sp.page);
  const mode = parseSmartMode(sp.ai);
  // Not awaited: results stream in behind the grid skeleton.
  const result = smartSearch({ query: decoded, scope: "tv", page, mode });
  return <SectionSearchResults query={decoded} result={result} page={page} mode={mode} section="tv-shows" />;
}
