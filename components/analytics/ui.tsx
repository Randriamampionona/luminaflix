import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "./format";

/** Shared building blocks of the /analytics dashboard. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6", className)}>
      {children}
    </section>
  );
}

export function CardTitle({
  icon: Icon,
  children,
  hint,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground">
        <Icon className="h-4 w-4 text-brand" aria-hidden />
        {children}
      </h2>
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </div>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl"
      />
      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-brand">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="relative mt-3 text-3xl font-black tracking-tight text-foreground">{value}</p>
      {sub && <p className="relative mt-1 truncate text-xs text-fg-subtle">{sub}</p>}
    </div>
  );
}

export function RankList({
  items,
  empty,
}: {
  items: { key: string; label: React.ReactNode; value: number; sub?: string }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-8 text-center text-sm text-fg-subtle">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="relative overflow-hidden rounded-xl px-3 py-2">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-xl bg-cyan-500/10"
            style={{ width: `${(item.value / max) * 100}%` }}
          />
          <span className="relative flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-fg-soft">{item.label}</span>
            <span className="shrink-0 font-bold text-foreground">
              {formatNumber(item.value)}
              {item.sub && <span className="ml-1 text-[11px] font-medium text-fg-subtle">{item.sub}</span>}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
