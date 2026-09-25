import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSearchKDramas } from "@/action/get-search-kdrama.action";
import { parsePage } from "@/components/layout/media-listing";
import SectionSearchResults from "@/components/media/section-search-results";
import { safeDecode } from "@/lib/media";

type Params = Promise<{ query: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { query } = await params;
  const t = await getTranslations("metadata.pages");
  return { title: t("search", { query: safeDecode(query) }), robots: { index: false } };
}

export default async function KDramaSearchPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ query }, sp] = await Promise.all([params, searchParams]);
  const decoded = safeDecode(query);
  const page = parsePage(sp.page);
  const data = await getSearchKDramas(decoded, page);
  return <SectionSearchResults query={decoded} data={data} page={page} section="k-drama" />;
}
