import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/movies/pagination";
import type { MediaKind } from "@/lib/media";
import { inferMediaKind } from "@/lib/media";
import type { Movie } from "@/typing";
import { EmptyState } from "./empty-state";
import { MediaGrid } from "./media-grid";

/** Posters in the first grid row are above the fold on most screens. */
const PRIORITY_COUNT = 6;

/**
 * Shared results block for every listing page: grid → empty state (with a
 * working reset link) → ad → server-rendered pagination.
 * PERF: the DOM is capped at one TMDB page (20 cards) per route and cards
 * use `content-visibility`, instead of an unbounded infinite list.
 */
export async function MediaListing({
  items,
  kind,
  page,
  totalPages,
  basePath,
  searchParams,
  emptyTitle,
  emptyDescription,
  resetHref,
  showAd = true,
}: {
  items: Movie[];
  /** Route kind for every card, or "auto" to infer per item (mixed results). */
  kind: MediaKind | "auto";
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  emptyTitle?: string;
  emptyDescription?: string;
  /** When set, the empty state offers a link back to the unfiltered list. */
  resetHref?: string;
  showAd?: boolean;
}) {
  const t = await getTranslations("filters");

  return (
    <>
      {items.length > 0 ? (
        <MediaGrid>
          {items.map((movie, index) => (
            <MovieCard
              key={`${movie.id}-${movie.media_type ?? ""}`}
              movie={movie}
              type={kind === "auto" ? inferMediaKind(movie) : kind}
              priority={page === 1 && index < PRIORITY_COUNT}
            />
          ))}
        </MediaGrid>
      ) : (
        <EmptyState
          title={emptyTitle ?? t("empty")}
          description={emptyDescription ?? (resetHref ? t("emptyBody") : undefined)}
          action={
            resetHref ? (
              <Link
                href={resetHref}
                className="text-xs font-black uppercase italic tracking-widest text-cyan-500 hover:underline"
              >
                {t("reset")}
              </Link>
            ) : undefined
          }
        />
      )}

      {showAd && (
        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>
      )}

      {items.length > 0 && (
        <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} searchParams={searchParams} />
      )}
    </>
  );
}

/** Parses `?page=` safely (1…500). */
export function parsePage(value?: string) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : 1;
}

/** Vertical divider used between filter and sort controls. */
export function ControlDivider() {
  return <span aria-hidden className="mx-1 h-6 w-px bg-white/10" />;
}

/** Adds the original title in parentheses (used on anime & K-drama grids). */
export function withOriginalTitle(item: Movie): Movie {
  const name = item.name || item.title || "";
  const original = item.original_name || item.original_title;
  return { ...item, title: original && original !== name ? `${name} (${original})` : name };
}
