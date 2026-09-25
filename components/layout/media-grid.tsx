import { cn } from "@/lib/utils";

/**
 * Standard poster grid. `cv-auto` (content-visibility) lets the browser skip
 * layout/paint for off-screen cards, which keeps long grids cheap to scroll.
 */
export const MEDIA_GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function MediaGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(MEDIA_GRID_CLASS, "media-grid", className)}>{children}</div>;
}
