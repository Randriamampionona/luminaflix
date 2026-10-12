import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/layout/skeletons";

export default function Loading() {
  return (
    <PageShell>
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-6 w-48 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-96 rounded-3xl xl:col-span-2" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </PageShell>
  );
}
