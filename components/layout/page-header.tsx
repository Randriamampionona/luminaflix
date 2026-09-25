import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

/** Page-level title block, shared by every listing and support page. */
export function PageHeader({
  eyebrow,
  title,
  accent,
  meta,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  /** Muted second half of the title (e.g. "Series <Vault>"). */
  accent?: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        {eyebrow && <p className={type.eyebrow}>{eyebrow}</p>}
        <h1 className={cn(type.h1, "wrap-break-word")}>
          {title}
          {accent && <span className="text-white/20"> {accent}</span>}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        {meta && (
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-8 bg-cyan-500" />
            <p className={type.meta}>{meta}</p>
          </div>
        )}
        {description && <p className={cn(type.body, "max-w-2xl")}>{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-end">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Section title used inside pages (rows, blocks). */
export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
  id,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow && <p className={type.eyebrow}>{eyebrow}</p>}
        <h2 id={id} className={cn(type.h2, "truncate")}>
          {title}
          <span className="text-cyan-500 not-italic">.</span>
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
