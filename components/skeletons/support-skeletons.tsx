import { PageShell } from "@/components/layout/page-shell";
import { HeaderSkeleton, LoadingRegion, Skeleton } from "@/components/layout/skeletons";

/** /privacy, /terms and /help: header, then text sections. */
export function ArticleSkeleton({ narrow = true }: { narrow?: boolean }) {
  return (
    <PageShell containerClassName={narrow ? "max-w-3xl" : undefined}>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <HeaderSkeleton eyebrow description />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="space-y-10">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/** /contact: intro column + form card. */
export function ContactSkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-8 lg:col-span-5">
          <HeaderSkeleton eyebrow description />
          <Skeleton className="h-20 w-full rounded-3xl" />
          <Skeleton className="h-20 w-full rounded-3xl" />
        </div>
        <div className="space-y-6 rounded-4xl border border-white/5 bg-zinc-950/60 p-6 sm:p-8 lg:col-span-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-44 rounded-2xl" />
          </div>
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/** /premium: hero, three plan cards, FAQ. */
export function PremiumSkeleton() {
  return (
    <PageShell>
      <LoadingRegion className="space-y-10 sm:space-y-14">
        <div className="flex flex-col items-center gap-6 rounded-[2.5rem] border border-white/5 bg-zinc-950 px-6 py-14 sm:py-20">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-12 w-72 max-w-full sm:h-16" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
          <Skeleton className="h-12 w-52 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-6 rounded-4xl border border-white/5 bg-zinc-950 p-8">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-8 w-28" />
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, j) => (
                  <Skeleton key={j} className="h-3 w-full" />
                ))}
              </div>
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}

/** Clerk sign-in / sign-up card placeholder (route loading + while Clerk's JS loads). */
export function AuthCardSkeleton() {
  return (
    <LoadingRegion className="w-full max-w-100 space-y-6 rounded-2xl border border-white/10 bg-zinc-950 p-8">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px grow bg-white/10" />
        <Skeleton className="h-2.5 w-6" />
        <span aria-hidden className="h-px grow bg-white/10" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="mx-auto h-3 w-44" />
    </LoadingRegion>
  );
}
