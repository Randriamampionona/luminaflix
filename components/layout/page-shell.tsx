import { cn } from "@/lib/utils";
import { spacing } from "@/lib/typography";
import { Container } from "./container";

/**
 * Standard page wrapper: clears the fixed navbar, applies the shared
 * vertical rhythm and the container. Removes the per-page `pt-32 px-8
 * md:px-16` variations that caused layout shifts between routes.
 */
export function PageShell({
  children,
  className,
  containerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <main className={cn("min-h-screen bg-black text-white", spacing.pageTop, spacing.pageBottom, className)}>
      <Container className={cn(spacing.stack, containerClassName)}>{children}</Container>
    </main>
  );
}
