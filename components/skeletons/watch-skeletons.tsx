import { Container } from "@/components/layout/container";
import { PageShell } from "@/components/layout/page-shell";
import { EpisodeGridSkeleton, LoadingRegion, Skeleton } from "@/components/layout/skeletons";
import { spacing } from "@/lib/typography";

/**
 * Mirrors <StreamPlayer>: language tabs, playback tip, 16:9 player, action
 * buttons, server grid and the status footer.
 */
function PlayerSkeleton({ tabs = true }: { tabs?: boolean }) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {tabs && <Skeleton className="h-12 w-64 rounded-2xl" />}
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="flex flex-col items-end space-y-2">
        <div className="relative aspect-video w-full overflow-hidden border border-white/10 bg-zinc-950 md:max-h-[77vh]">
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse bg-linear-to-t from-black via-zinc-950 to-zinc-900/70"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
            <Skeleton className="h-7 w-64 max-w-[70%]" />
            <Skeleton className="h-14 w-48 rounded-2xl" />
          </div>
        </div>
        <div className="flex gap-2 p-1">
          <Skeleton className="h-12 w-44 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-21 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-4xl" />
    </div>
  );
}

/** /movies/[id]: title, player, synopsis + details card. */
export function MovieWatchSkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-12 rounded-lg" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-10 w-3/4 max-w-2xl sm:h-14" />
        </div>
        <PlayerSkeleton />
        <div className="grid grid-cols-1 gap-12 border-t border-white/5 pt-12 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-6 rounded-[3rem] border border-white/5 bg-zinc-900/30 p-8">
            <Skeleton className="h-2.5 w-20" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex justify-between border-b border-white/5 pb-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/** /anime/play/[id] and /k-drama/play/[id]. */
export function EpisodeWatchSkeleton({ tabs = true }: { tabs?: boolean }) {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-10 w-72 max-w-full sm:h-14 sm:w-md" />
              <Skeleton className="h-5 w-52" />
            </div>
          </div>
          <Skeleton className="h-12 w-32 rounded-2xl" />
        </div>
        <PlayerSkeleton tabs={tabs} />
        <div className="flex gap-6 rounded-[2.5rem] border border-white/5 bg-zinc-900/20 p-6 sm:p-8">
          <Skeleton className="hidden h-14 w-14 rounded-2xl sm:block" />
          <div className="grow space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/** /anime/[id] and /k-drama/[id]: backdrop hero, then season tabs + episodes. */
export function SeriesDetailsSkeleton() {
  return (
    <LoadingRegion className={`min-h-screen bg-black ${spacing.pageBottom}`}>
      <section className="relative flex h-[69vh] min-h-130 w-full items-end bg-zinc-950">
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-linear-to-t from-black via-zinc-950 to-zinc-900/60"
        />
        <Container className="relative pb-10">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-12 w-4/5 sm:h-16" />
            <Skeleton className="h-7 w-1/2" />
            <div className="max-w-2xl space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>
        </Container>
      </section>
      <Container className={`${spacing.section} space-y-10`}>
        <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-16 rounded-xl" />
            ))}
          </div>
        </div>
        <EpisodeGridSkeleton />
      </Container>
    </LoadingRegion>
  );
}

/** /trailer/[id]: player, title details and the actions/language panel. */
export function TrailerSkeleton() {
  return (
    <PageShell containerClassName="max-w-6xl">
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-2.5 w-28" />
          </div>
          <Skeleton className="hidden h-2.5 w-32 sm:block" />
        </div>
        <Skeleton className="aspect-video w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex gap-5 lg:col-span-8">
            <Skeleton className="hidden aspect-2/3 w-32 shrink-0 rounded-2xl sm:block" />
            <div className="grow space-y-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-3.5 w-48" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </div>
          <div className="space-y-6 rounded-4xl border border-white/10 bg-zinc-950/70 p-6 lg:col-span-4">
            <Skeleton className="h-13 w-full rounded-2xl" />
            <Skeleton className="h-2.5 w-32" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      </LoadingRegion>
    </PageShell>
  );
}
