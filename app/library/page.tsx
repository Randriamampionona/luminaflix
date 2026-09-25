import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, LayoutGrid, Star, TrendingUp, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getLibrary } from "@/action/get-library.action";
import { MediaListing, parsePage } from "@/components/layout/media-listing";
import { PageShell } from "@/components/layout/page-shell";
import AdvancedFilter from "@/components/movies/advanced-filter";
import SortDropdown from "@/components/movies/sort-dropdown";
import { SORT_OPTIONS, resolveSort } from "@/lib/filters";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const DEFAULT_SORT = "vote_average.desc";
type SearchParams = { page?: string; sort?: string; genre?: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("library") };
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const sort = resolveSort(params.sort, "movie", DEFAULT_SORT);
  const genre = params.genre ?? "all";

  const [t, tFilters, data] = await Promise.all([
    getTranslations("pages.library"),
    getTranslations("filters"),
    getLibrary(page, sort, genre),
  ]);

  const sortKey = SORT_OPTIONS.movie.find((option) => option.value === sort)?.key ?? "topRated";

  // BUG FIX: these tiles looked clickable but did nothing.
  const shortcuts: { href: string; label: string; icon: LucideIcon; active: boolean }[] = [
    { href: "/library?sort=vote_average.desc", label: t("shortcuts.topRated"), icon: Star, active: sort === "vote_average.desc" },
    { href: "/library?sort=popularity.desc", label: t("shortcuts.popular"), icon: TrendingUp, active: sort === "popularity.desc" },
    { href: "/favorites", label: t("shortcuts.favorites"), icon: Bookmark, active: false },
    { href: "/genres", label: t("shortcuts.genres"), icon: LayoutGrid, active: false },
  ];

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <header className="flex flex-col justify-between rounded-[2.5rem] border border-white/5 bg-linear-to-br from-zinc-900 to-black p-7 md:col-span-2 lg:p-10">
          <h1 className={type.h1}>
            {t("title")} <span className="text-cyan-500">{t("accent")}</span>
            <span className="text-cyan-500 not-italic">.</span>
          </h1>
          <p className={cn(type.meta, "mt-8 flex items-center gap-2")}>
            <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
            {t("count", { count: data.total_results })}
          </p>
        </header>

        <nav className="grid grid-cols-2 gap-4">
          {shortcuts.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex flex-col items-center justify-center gap-3 rounded-4xl border p-6 text-center transition-all",
                active
                  ? "border-cyan-500/60 bg-cyan-500/10"
                  : "border-white/5 bg-zinc-900/50 hover:border-cyan-500/50",
              )}
            >
              <Icon className="h-6 w-6 text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
                {label}
              </span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-full bg-cyan-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black">
            {t("allContent")}
          </span>
          <span className={type.meta}>{t("sortedBy", { sort: tFilters(`sort.${sortKey}`) })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdvancedFilter mediaType="movie" showYear={false} />
          <SortDropdown mediaType="movie" defaultSort={DEFAULT_SORT} />
        </div>
      </div>

      <MediaListing
        items={data.results}
        kind="movie"
        page={page}
        totalPages={data.total_pages}
        basePath="/library"
        searchParams={params}
        resetHref="/library"
      />
    </PageShell>
  );
}
