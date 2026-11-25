import { Search, UploadCloud, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageAd from "@/components/ads/page-ad";
import CommunityCard from "@/components/community/community-card";
import { EmptyState } from "@/components/layout/empty-state";
import { MediaGrid } from "@/components/layout/media-grid";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import Pagination from "@/components/movies/pagination";
import { findApprovedCommunity } from "@/lib/community/server";
import { COMMUNITY_CATEGORIES, toCardVideo, type CommunityCategory } from "@/lib/community/types";
import { cn } from "@/lib/utils";

const PER_PAGE = 24;

type SearchParams = Promise<{ type?: string; q?: string; page?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const [t, tb] = await Promise.all([getTranslations("metadata.pages"), getTranslations("community.browse")]);
  return {
    title: t("communityBrowse"),
    description: tb("description"),
    alternates: { canonical: "/community/browse" },
  };
}

/** /community/browse — every approved upload: category tabs, search, pages of 24. */
export default async function CommunityBrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = COMMUNITY_CATEGORIES.includes(sp.type as CommunityCategory)
    ? (sp.type as CommunityCategory)
    : undefined;
  const query = (sp.q ?? "").trim().slice(0, 80);
  const [t, tc, videos] = await Promise.all([
    getTranslations("community.browse"),
    getTranslations("community"),
    findApprovedCommunity({ category, query }),
  ]);

  const totalPages = Math.max(1, Math.ceil(videos.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const shown = videos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const tabHref = (key?: CommunityCategory) => {
    const params = new URLSearchParams();
    if (key) params.set("type", key);
    if (query) params.set("q", query);
    const qs = params.toString();
    return `/community/browse${qs ? `?${qs}` : ""}`;
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        accent={t("accent")}
        description={t("description")}
        actions={
          <Link
            href="/community/upload"
            className="inline-flex items-center gap-2 rounded-2xl border border-violet-500/50 bg-violet-500/10 px-4 py-2.5 text-[10px] font-black tracking-widest text-foreground uppercase transition-colors hover:bg-violet-500/20"
          >
            <UploadCloud className="h-4 w-4 text-violet-500 dark:text-violet-300" aria-hidden />
            {t("upload")}
          </Link>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category tabs */}
        <nav aria-label={t("eyebrow")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {[undefined, ...COMMUNITY_CATEGORIES].map((key) => (
            <Link
              key={key ?? "all"}
              href={tabHref(key)}
              aria-current={category === key ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-colors",
                category === key
                  ? "border-cyan-500 bg-cyan-500 text-black"
                  : "border-line-strong bg-tint text-fg-muted hover:border-cyan-500/50 hover:text-foreground",
              )}
            >
              {key ? tc(`categories.${key}`) : t("all")}
            </Link>
          ))}
        </nav>

        {/* Community search */}
        <form action="/community/browse" method="get" role="search" className="flex w-full gap-2 lg:w-96">
          {category && <input type="hidden" name="type" value={category} />}
          <label className="relative flex-1">
            <span className="sr-only">{t("searchPlaceholder")}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-fg-faint"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t("searchPlaceholder")}
              className="h-11 w-full rounded-2xl border border-line-strong bg-tint pr-4 pl-11 text-sm text-foreground outline-none placeholder:text-fg-faint focus:border-cyan-500/60"
            />
          </label>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-2xl bg-cyan-500 px-4 text-[10px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
          >
            {t("search")}
          </button>
          {query && (
            <Link
              href={tabHref(category)}
              aria-label={t("clear")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-tint text-fg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </form>
      </div>

      <p className="text-[10px] font-black tracking-widest text-fg-subtle uppercase">
        {t("count", { count: videos.length })}
      </p>

      {shown.length > 0 ? (
        <MediaGrid>
          {shown.map((video, i) => (
            <CommunityCard key={video.id} video={toCardVideo(video)} priority={i < 6} />
          ))}
        </MediaGrid>
      ) : (
        <EmptyState
          title={t("empty")}
          action={
            <Link
              href="/community/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-black uppercase"
            >
              <UploadCloud className="h-4 w-4" aria-hidden />
              {t("emptyCta")}
            </Link>
          }
        />
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/community/browse"
          searchParams={{ type: category, q: query || undefined }}
        />
      )}

      <PageAd />
    </PageShell>
  );
}
