import { cn } from "@/lib/utils";
import { MEDIA_GRID_CLASS } from "./media-grid";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-zinc-900/80", className)} />;
}

export function PosterSkeleton() {
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

export function HeaderSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-2.5 w-24" />
      <Skeleton className="h-12 w-72 max-w-full sm:h-14" />
      <Skeleton className="h-2.5 w-40" />
    </div>
  );
}
