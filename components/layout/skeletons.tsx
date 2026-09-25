import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MEDIA_GRID_CLASS } from "./media-grid";

/**
 * Skeleton primitives. Page-level skeletons (components/skeletons/*) are built
 * from these and from the same layout components the real pages use
 * (PageShell, Container, MEDIA_GRID_CLASS), so nothing shifts when the
 * content streams in.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-zinc-900/80", className)} />;
}

/** Announces the loading state to assistive tech; the shapes are aria-hidden. */
export function LoadingRegion({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useTranslations("common");
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{t("loading")}</span>
      {children}
    </div>
  );
}

function PosterSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={MEDIA_GRID_CLASS}>
      {Array.from({ length: count }, (_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors <PageHeader>: eyebrow, h1, meta line and optional right-side actions. */
export function HeaderSkeleton({
  eyebrow = false,
  actions,
  description = false,
}: {
  eyebrow?: boolean;
  actions?: React.ReactNode;
  description?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow && <Skeleton className="h-2.5 w-24" />}
        <Skeleton className="h-10 w-64 max-w-full sm:h-14 sm:w-80" />
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px w-8 bg-cyan-500/30" />
          <Skeleton className="h-2.5 w-32" />
        </div>
        {description && (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-3 w-96 max-w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** Filter + sort pills used on catalog pages. */
export function FilterBarSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-32 rounded-full" />
      <span aria-hidden className="mx-1 h-6 w-px bg-white/10" />
      <Skeleton className="h-10 w-44 rounded-lg" />
    </>
  );
}

export function PaginationSkeleton() {
  return (
    <div className="flex justify-center gap-2 border-t border-white/5 pt-10">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-9 w-9 rounded-xl sm:h-12 sm:w-12" />
      ))}
    </div>
  );
}

/** Mirrors a series episode grid (components/episode-explorer.tsx). */
export function EpisodeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-video w-full rounded-2xl" />
      ))}
    </div>
  );
}
