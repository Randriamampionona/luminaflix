import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import SearchPage from "@/components/search/search-page";
import PageAd from "@/components/ads/page-ad";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("search");
  return { title: t("pageTitle"), robots: { index: false } };
}

/** /search — the full search experience (phones open it from the menu and the search icon). */
export default async function SearchRoute({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const sp = await searchParams;
  return (
    <PageShell containerClassName="max-w-4xl">
      <SearchPage initialQuery={sp.q ?? ""} initialType={sp.type ?? "all"} />
      {/* Ad */}
      <PageAd />
    </PageShell>
  );
}
