import { cn } from "@/lib/utils";
import { type } from "@/lib/typography";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 px-6 py-24 text-center sm:py-32",
        className,
      )}
    >
      {icon && (
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-zinc-900 text-zinc-600">
          {icon}
        </div>
      )}
      <h2 className={type.h3}>{title}</h2>
      {description && <p className={cn(type.body, "max-w-md")}>{description}</p>}
      {action}
    </div>
  );
}
