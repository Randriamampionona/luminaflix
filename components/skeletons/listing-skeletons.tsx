import { PageShell } from "@/components/layout/page-shell";
import {
  FilterBarSkeleton,
  GridSkeleton,
  HeaderSkeleton,
  LoadingRegion,
  PaginationSkeleton,
  Skeleton,
} from "@/components/layout/skeletons";

type Controls = "filters" | "filter" | "search" | "none";

function ControlsSkeleton({ controls }: { controls: Controls }) {
  if (controls === "filters") return <FilterBarSkeleton />;
  if (controls === "filter") return <Skeleton className="h-10 w-32 rounded-full" />;
  if (controls === "search") return <Skeleton className="h-12 w-72 max-w-full rounded-2xl sm:w-96" />;
  return null;
}

/**
 * Catalog pages (movies, series, new & popular, anime, K-drama, genre):
 * header with filters/search, 18-poster grid, pagination.
 */
export function ListingSkeleton({ controls = "filters", eyebrow = false }: { controls?: Controls; eyebrow?: boolean }) {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <HeaderSkeleton
          eyebrow={eyebrow}
          actions={controls === "none" ? undefined : <ControlsSkeleton controls={controls} />}
        />
        <GridSkeleton count={18} />
        <PaginationSkeleton />
      </LoadingRegion>
    </PageShell>
  );
}

/** /library: bento header + shortcut tiles, control bar, grid. */
export function LibrarySkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex min-h-48 flex-col justify-between rounded-[2.5rem] border border-white/5 bg-zinc-950 p-7 md:col-span-2 lg:p-10">
            <Skeleton className="h-12 w-3/4 max-w-md sm:h-14" />
            <Skeleton className="mt-8 h-2.5 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-4xl" />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-2.5 w-36" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
        </div>
        <GridSkeleton count={18} />
        <PaginationSkeleton />
      </LoadingRegion>
    </PageShell>
  );
}

/** /genres: tile directory. */
export function GenresSkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <HeaderSkeleton eyebrow />
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-video rounded-none md:aspect-square" />
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/**
 * Search results: back link (section searches), "Results for …" header with
 * match count, then the result grid.
 */
export function SearchSkeleton({ backLink = false }: { backLink?: boolean }) {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="space-y-8">
          {backLink && <Skeleton className="h-3 w-40" />}
          <HeaderSkeleton
            eyebrow={!backLink}
            actions={backLink ? undefined : <Skeleton className="h-9 w-32 rounded-full" />}
          />
        </div>
        <GridSkeleton count={18} />
      </LoadingRegion>
    </PageShell>
  );
}

/** /favorites: header + two-column list of wide cards. */
export function FavoritesSkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <HeaderSkeleton eyebrow />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-6 rounded-2xl border border-white/5 bg-white/2 p-4">
              <Skeleton className="h-32 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 grow space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}
