import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** TMDB never serves beyond page 500. */
const MAX_PAGES = 500;
const WINDOW = 5;

/**
 * Server component: builds links from the page's own search params, so it no
 * longer needs useSearchParams (and the client bundle / Suspense it implied).
 */
export default async function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const t = await getTranslations("pagination");
  const lastPage = Math.min(totalPages, MAX_PAGES);
  if (lastPage <= 1) return null;

  const start = Math.max(1, Math.min(currentPage - 2, lastPage - WINDOW + 1));
  const pages = Array.from({ length: Math.min(WINDOW, lastPage) }, (_, i) => start + i);

  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const arrow =
    "rounded-xl border border-white/5 bg-zinc-900 p-2 transition-colors duration-300 hover:border-cyan-500/50 hover:bg-cyan-500 hover:text-black sm:p-3";

  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/5 pt-10 sm:gap-2">
      {currentPage > 1 && (
        <Link href={href(currentPage - 1)} aria-label={t("previous")} className={arrow}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={href(page)}
          aria-label={t("page", { page })}
          aria-current={page === currentPage ? "page" : undefined}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-colors duration-300 sm:h-12 sm:w-12 sm:text-base",
            page === currentPage
              ? "bg-cyan-500 text-black shadow-[0_0_30px_rgba(6,182,212,0.3)]"
              : "border border-white/5 bg-zinc-900 text-zinc-500 hover:text-white",
          )}
        >
          {page}
        </Link>
      ))}

      {currentPage < lastPage && (
        <Link href={href(currentPage + 1)} aria-label={t("next")} className={arrow}>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}
    </nav>
  );
}
