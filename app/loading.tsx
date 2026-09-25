import { PageShell } from "@/components/layout/page-shell";
import { GridSkeleton, HeaderSkeleton } from "@/components/layout/skeletons";

/** Route-level skeleton: same shell as every page, so nothing shifts on load. */
export default function Loading() {
  return (
    <PageShell>
      <HeaderSkeleton />
      <GridSkeleton count={18} />
    </PageShell>
  );
}
