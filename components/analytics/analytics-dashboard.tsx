"use client";

import {
  Activity,
  Clock,
  Eye,
  FileText,
  Globe2,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { AnalyticsData } from "@/lib/analytics/queries";
import { cn } from "@/lib/utils";
import { CountryChart, TrafficChart } from "./charts";
import { countryName, flag, formatDuration, formatNumber, formatPercent, timeAgo } from "./format";
import RangePicker from "./range-picker";
import VisitorsTable from "./visitors-table";

const REFRESH_MS = 30_000;

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6", className)}>
      {children}
    </section>
  );
}

function CardTitle({ icon: Icon, children, hint }: { icon: LucideIcon; children: React.ReactNode; hint?: string }) {
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

function Kpi({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
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

function RankList({
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

export default function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"anonymous" | "authenticated">("anonymous");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, startRefresh] = useTransition();

  // "Real-time": re-fetch the server data every 30 s while the tab is visible.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") startRefresh(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, router]);

  const { kpis } = data;
  const topPage = data.topPages[0];
  const topCountry = data.countries[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-brand">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Admin · Analytics
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Traffic overview<span className="text-brand">.</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {formatNumber(data.liveNow)} active now
            </span>
            <span>Updated {timeAgo(data.generatedAt)}</span>
            {data.truncated && <span className="text-amber-600">Showing the latest 10,000 sessions</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RangePicker range={data.range} />
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            aria-pressed={autoRefresh}
            title="Refresh every 30 seconds"
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
              autoRefresh ? "border-cyan-500/40 bg-cyan-500/10 text-brand" : "border-line-strong bg-tint text-fg-muted",
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} aria-hidden />
            Live
          </button>
        </div>
      </div>

      {kpis.sessions === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            No visits recorded for this period yet. Open the site in another browser or private window, browse a few
            pages, then refresh this page (visits to /analytics itself are not counted).
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Unique visitors"
          value={formatNumber(kpis.uniqueVisitors)}
          sub={`${formatNumber(kpis.sessions)} sessions · ${formatPercent(kpis.authenticatedShare)} signed in`}
        />
        <Kpi
          icon={Clock}
          label="Avg. session"
          value={formatDuration(kpis.avgSessionDuration)}
          sub={`Bounce rate ${formatPercent(kpis.bounceRate)}`}
        />
        <Kpi
          icon={FileText}
          label="Top page"
          value={topPage ? formatNumber(topPage.views) : "—"}
          sub={topPage ? `${topPage.path} · ${formatNumber(kpis.pageViews)} views total` : "No page views yet"}
        />
        <Kpi
          icon={Globe2}
          label="Top location"
          value={topCountry ? `${flag(topCountry.country)} ${formatNumber(topCountry.visitors)}` : "—"}
          sub={
            topCountry ? `${countryName(topCountry.country)} · ${data.countries.length} countries` : "No visitors yet"
          }
        />
      </div>

      {/* Traffic + countries */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle icon={Activity}>Traffic</CardTitle>
          <TrafficChart data={data.series} />
        </Card>
        <Card>
          <CardTitle icon={Globe2} hint="Unique visitors">
            Countries
          </CardTitle>
          <CountryChart data={data.countries} />
        </Card>
      </div>

      {/* Pages + devices */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={Eye} hint="Views · visitors">
            Top pages
          </CardTitle>
          <RankList
            empty="No page views for this period."
            items={data.topPages.map((p) => ({
              key: p.path,
              label: <span className="font-mono text-xs">{p.path}</span>,
              value: p.views,
              sub: `· ${formatNumber(p.visitors)}`,
            }))}
          />
        </Card>
        <Card>
          <CardTitle icon={MousePointerClick} hint="Sessions">
            Devices & browsers
          </CardTitle>
          <RankList
            empty="No sessions yet."
            items={[
              ...data.devices.map((d) => ({
                key: `d-${d.device}`,
                label: <span className="capitalize">{d.device}</span>,
                value: d.sessions,
              })),
              ...data.browsers.map((b) => ({ key: `b-${b.browser}`, label: b.browser, value: b.sessions })),
            ]}
          />
        </Card>
      </div>

      {/* Visitors */}
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Visitor type"
            className="flex rounded-xl border border-line-strong bg-tint p-1"
          >
            {(
              [
                { key: "anonymous", label: "Anonymous visitors", icon: Globe2, count: data.anonymous.length },
                {
                  key: "authenticated",
                  label: "Authenticated users",
                  icon: UserCheck,
                  count: data.authenticated.length,
                },
              ] as const
            ).map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                  tab === key ? "bg-surface text-foreground shadow" : "text-fg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", tab === key && "text-brand")} aria-hidden />
                {label}
                <span className="rounded-md bg-tint-strong px-1.5 py-0.5 text-[10px]">{formatNumber(count)}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-fg-subtle">IPs are masked (last block removed) and never stored in full.</p>
        </div>
        <div role="tabpanel">
          {tab === "anonymous" ? (
            <VisitorsTable key="anonymous" kind="anonymous" rows={data.anonymous} />
          ) : (
            <VisitorsTable key="authenticated" kind="authenticated" rows={data.authenticated} />
          )}
        </div>
      </Card>
    </div>
  );
}
