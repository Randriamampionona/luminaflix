"use client";

import { ArrowDown, ArrowUp, Monitor, Search, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";
import type { VisitorRow } from "@/lib/analytics/queries";
import { cn } from "@/lib/utils";
import { countryName, flag, formatDuration, formatNumber, timeAgo } from "./format";

type SortKey = "lastActive" | "sessions" | "visitFrequency" | "avgDuration" | "pageViews";

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;

function SortHeader({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-4 py-3 font-bold", className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 uppercase tracking-wider transition-colors hover:text-foreground",
          active && "text-brand",
        )}
      >
        {label}
        {active && <Icon className="h-3 w-3" aria-hidden />}
      </button>
    </th>
  );
}

function PagesCell({ pages }: { pages: string[] }) {
  const shown = pages.slice(0, 3);
  return (
    <div className="flex max-w-xs flex-wrap gap-1" title={pages.join("\n")}>
      {shown.map((page) => (
        <span
          key={page}
          className="truncate rounded-md bg-tint-strong px-1.5 py-0.5 font-mono text-[10px] text-fg-soft"
        >
          {page}
        </span>
      ))}
      {pages.length > shown.length && (
        <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">
          +{pages.length - shown.length}
        </span>
      )}
    </div>
  );
}

/** Anonymous (IP-based) or authenticated visitors, searchable and sortable. */
export default function VisitorsTable({ rows, kind }: { rows: VisitorRow[]; kind: "anonymous" | "authenticated" }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "lastActive", dir: "desc" });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) =>
          [r.label, r.name, r.email, r.country, countryName(r.country), r.city, ...r.pages]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sort.key === "lastActive" ? Date.parse(a.lastActive) : a[sort.key];
      const bv = sort.key === "lastActive" ? Date.parse(b.lastActive) : b[sort.key];
      return (av - bv) * factor;
    });
  }, [rows, query, sort]);

  const onSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-line-strong bg-tint px-3 py-2 focus-within:border-cyan-500/50">
          <Search className="h-4 w-4 text-fg-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === "anonymous" ? "Search IP, country, page…" : "Search name, email, page…"}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-fg-faint"
          />
        </label>
        <p className="text-xs text-fg-subtle">
          {formatNumber(visible.length)} {kind === "anonymous" ? "IP addresses" : "users"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-line bg-tint-soft text-[10px] text-fg-subtle">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">
                {kind === "anonymous" ? "IP address" : "User"}
              </th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Location</th>
              <SortHeader label="Visits" column="visitFrequency" sort={sort} onSort={onSort} />
              <SortHeader label="Sessions" column="sessions" sort={sort} onSort={onSort} />
              <SortHeader label="Avg. session" column="avgDuration" sort={sort} onSort={onSort} />
              <SortHeader label="Views" column="pageViews" sort={sort} onSort={onSort} />
              <th className="px-4 py-3 font-bold uppercase tracking-wider">
                {kind === "anonymous" ? "Pages viewed" : "Route history"}
              </th>
              <SortHeader label="Last active" column="lastActive" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-fg-subtle">
                  No visitors for this period.
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const DeviceIcon = DEVICE_ICON[row.device as keyof typeof DEVICE_ICON] ?? Monitor;
              return (
                <tr key={row.key} className="transition-colors hover:bg-tint-soft">
                  <td className="px-4 py-3">
                    {kind === "anonymous" ? (
                      <div className="flex items-center gap-2">
                        <DeviceIcon className="h-4 w-4 shrink-0 text-fg-faint" aria-label={row.device} />
                        <div>
                          <p className="font-mono text-xs font-semibold text-foreground">{row.label}</p>
                          <p className="text-[10px] text-fg-subtle">{row.browser}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar
                          <img src={row.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-black text-brand">
                            {(row.name ?? row.email ?? "?")[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{row.name ?? "—"}</p>
                          <p className="truncate text-[11px] text-fg-subtle">{row.email ?? row.label}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="mr-1.5">{flag(row.country)}</span>
                    <span className="text-fg-soft">{countryName(row.country)}</span>
                    {row.city && <span className="block text-[11px] text-fg-subtle">{row.city}</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{formatNumber(row.visitFrequency)}</td>
                  <td className="px-4 py-3 text-fg-soft">{formatNumber(row.sessions)}</td>
                  <td className="px-4 py-3 text-fg-soft">{formatDuration(row.avgDuration)}</td>
                  <td className="px-4 py-3 text-fg-soft">{formatNumber(row.pageViews)}</td>
                  <td className="px-4 py-3">
                    <PagesCell pages={row.pages} />
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-xs text-fg-subtle"
                    title={new Date(row.lastActive).toLocaleString()}
                  >
                    {timeAgo(row.lastActive)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
