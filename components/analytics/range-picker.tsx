"use client";

import { CalendarDays, Check, Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { RangeKey } from "@/lib/analytics/queries";
import { cn } from "@/lib/utils";

const PRESETS: { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];

/** Today / 7 days / 30 days / custom range — kept in the URL (?range=…&from=…&to=…). */
export default function RangePicker({ range }: { range: { key: RangeKey; fromDay: string; toDay: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(range.key === "custom");
  const [from, setFrom] = useState(range.fromDay);
  const [to, setTo] = useState(range.toDay);

  const go = (query: string) => startTransition(() => router.push(`${pathname}?${query}`, { scroll: false }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="no-scrollbar flex max-w-full overflow-x-auto rounded-xl border border-line-strong bg-tint p-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              go(`range=${preset.key}`);
            }}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors",
              range.key === preset.key && !customOpen
                ? "bg-cyan-500 text-black shadow"
                : "text-fg-muted hover:text-foreground",
            )}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors",
            range.key === "custom" || customOpen
              ? "bg-cyan-500 text-black shadow"
              : "text-fg-muted hover:text-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          Custom
        </button>
      </div>

      {customOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(`range=custom&from=${from}&to=${to}`);
          }}
          className="flex items-center gap-2 rounded-xl border border-line-strong bg-tint p-1 pl-3 animate-in fade-in slide-in-from-top-1"
        >
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From"
            className="bg-transparent text-xs font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />
          <span className="text-xs text-fg-faint">→</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To"
            className="bg-transparent text-xs font-semibold text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1 rounded-lg bg-inverse px-3 py-1.5 text-xs font-bold text-inverse-fg"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Apply
          </button>
        </form>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-brand" aria-label="Loading" />}
    </div>
  );
}
