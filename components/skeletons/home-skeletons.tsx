import { Container } from "@/components/layout/container";
import { LoadingRegion, Skeleton } from "@/components/layout/skeletons";
import { spacing } from "@/lib/typography";

/** Mirrors <HeroSlider>: full-height backdrop with left-aligned copy and CTAs. */
export function HeroSkeleton() {
  return (
    <LoadingRegion className="relative h-[90vh] min-h-150 w-full overflow-hidden bg-zinc-950 md:h-screen">
      <div
        aria-hidden
        className="absolute inset-0 animate-pulse bg-linear-to-r from-zinc-900/60 via-zinc-950 to-black"
      />
      <Container className="relative flex h-full flex-col justify-center gap-6">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-4/5 max-w-2xl sm:h-16" />
          <Skeleton className="h-12 w-3/5 max-w-xl sm:h-16" />
        </div>
        <div className="max-w-xl space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </Container>
    </LoadingRegion>
  );
}

/** Mirrors <MovieRow>: section title + arrows, then a horizontal poster strip. */
export function RowSkeleton() {
  return (
    <LoadingRegion className="py-6 sm:py-8">
      <Container className="space-y-5">
        <div className="flex items-end justify-between">
          <Skeleton className="h-7 w-56 sm:h-8" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden pb-4">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="w-37.5 shrink-0 space-y-3 md:w-50">
              <Skeleton className="aspect-2/3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      </Container>
    </LoadingRegion>
  );
}

/** Mirrors the "Browse by category" genre tiles on the home page. */
export function GenreTilesSkeleton() {
  return (
    <LoadingRegion className={spacing.section}>
      <Container className="space-y-8">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-8 w-64 max-w-full" />
          </div>
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      </Container>
    </LoadingRegion>
  );
}

/** Mirrors <FeaturedBanner>. */
export function BannerSkeleton() {
  return (
    <LoadingRegion className="py-10 sm:py-14">
      <Container>
        <Skeleton className="min-h-75 w-full rounded-xl md:min-h-100" />
      </Container>
    </LoadingRegion>
  );
}

export function HomeSkeleton() {
  return (
    <main className="relative min-h-screen bg-black">
      <HeroSkeleton />
      <RowSkeleton />
      <GenreTilesSkeleton />
      <RowSkeleton />
    </main>
  );
}
