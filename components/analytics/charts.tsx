"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";
import { countryName, flag, formatNumber, shortDay } from "./format";

type Metric = "visitors" | "sessions" | "pageViews";
const METRICS: { key: Metric; label: string }[] = [
  { key: "visitors", label: "Visitors" },
  { key: "sessions", label: "Sessions" },
  { key: "pageViews", label: "Page views" },
];

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-bold text-foreground">
        {typeof label === "string" && /^\d{4}-/.test(label) ? shortDay(label) : label}
      </p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-fg-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-bold text-foreground">{formatNumber(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

/** Visitors / sessions / page views per day. */
export function TrafficChart({
  data,
}: {
  data: { day: string; visitors: number; sessions: number; pageViews: number }[];
}) {
  const [metric, setMetric] = useState<Metric>("visitors");
  const label = METRICS.find((m) => m.key === metric)?.label ?? "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
              metric === m.key ? "bg-cyan-500/15 text-brand" : "text-fg-subtle hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={shortDay}
              tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--line-stronger)" }} />
            <Area
              type="monotone"
              dataKey={metric}
              name={label}
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#trafficFill)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Visitors by country, horizontal bars. */
export function CountryChart({ data }: { data: { country: string; visitors: number; sessions: number }[] }) {
  const rows = data.slice(0, 8).map((c) => ({ ...c, label: `${flag(c.country)} ${countryName(c.country)}` }));
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-fg-subtle">No data for this period.</p>;

  return (
    <div style={{ height: Math.max(160, rows.length * 40) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={{ fill: "var(--fg-soft)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={ChartTooltip} cursor={{ fill: "var(--tint)" }} />
          <Bar dataKey="visitors" name="Visitors" fill="#06b6d4" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Short-link clicks and unique people per day. */
export function ClicksChart({ data }: { data: { day: string; clicks: number; visitors: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="clicksFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="peopleFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="day"
            tickFormatter={shortDay}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--line-stronger)" }} />
          <Area
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="#a855f7"
            strokeWidth={2.5}
            fill="url(#clicksFill)"
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            name="People"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#peopleFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
