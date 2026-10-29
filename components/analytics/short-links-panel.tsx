"use client";

import {
  Clapperboard,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  MousePointerClick,
  Share2,
  Users,
  Film,
  ListVideo,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import type { ShortLinkStats } from "@/lib/short-links-server";
import type { ShortLinkKind } from "@/lib/short-links";
import { cn } from "@/lib/utils";
import { ClicksChart } from "./charts";
import { countryName, flag, formatNumber, timeAgo } from "./format";
import { Card, CardTitle, Kpi, RankList } from "./ui";

const KIND: Record<ShortLinkKind, { label: string; icon: typeof Film; tone: string }> = {
  page: { label: "Movie link", icon: Film, tone: "bg-cyan-500/15 text-brand" },
  trailer: { label: "Trailer", icon: Clapperboard, tone: "bg-purple-500/15 text-purple-600 dark:text-purple-300" },
  poster: { label: "Poster", icon: ImageIcon, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  series: { label: "All episodes", icon: ListVideo, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
};

const SOURCE: Record<string, string> = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  tiktok: "TikTok",
  x: "X / Twitter",
  other: "Other websites",
  direct: "Direct / copied",
};

const CHANNEL: Record<string, string> = {
  copy: "Copy button",
  native: "Phone share sheet",
  whatsapp: "WhatsApp button",
  telegram: "Telegram button",
};

const noop = () => () => {};
const getOrigin = () => window.location.origin;
/** "Last click … ago" is measured from when the page opened (a stable snapshot). */
let openedAt = 0;
const getOpenedAt = () => (openedAt ||= Date.now());

/** /analytics — short links shared from the share card: clicks, people, where from, top links. */
export default function ShortLinksPanel({ stats }: { stats: ShortLinkStats }) {
  const origin = useSyncExternalStore(noop, getOrigin, () => "");
  const now = useSyncExternalStore(noop, getOpenedAt, () => 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Share2 className="h-4 w-4 text-brand" aria-hidden />
        <h2 className="text-sm font-black tracking-tight text-foreground">Shared links</h2>
        <span className="text-[11px] text-fg-subtle">
          · clicks on LuminaFlix short links (your own clicks and link-preview robots excluded)
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={MousePointerClick}
          label="Clicks"
          value={formatNumber(stats.totalClicks)}
          sub="On shared links, this period"
        />
        <Kpi
          icon={Users}
          label="People"
          value={formatNumber(stats.uniqueVisitors)}
          sub={
            stats.uniqueVisitors
              ? `${(stats.totalClicks / stats.uniqueVisitors).toFixed(1)} clicks per person`
              : "No clicks yet"
          }
        />
        <Kpi icon={Link2} label="Links clicked" value={formatNumber(stats.linksClicked)} sub="Different short links" />
        <Kpi
          icon={Share2}
          label="Shares"
          value={formatNumber(stats.shares)}
          sub={`Copied or sent, this period · ${formatNumber(stats.linksShared)} titles shared all time`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle icon={MousePointerClick} hint="Purple: clicks · Cyan: people">
            Clicks per day
          </CardTitle>
          {stats.totalClicks ? (
            <ClicksChart data={stats.series} />
          ) : (
            <p className="py-16 text-center text-sm text-fg-subtle">No clicks on shared links for this period.</p>
          )}
        </Card>
        <Card>
          <CardTitle icon={Share2} hint="Clicks">
            Where they clicked
          </CardTitle>
          <RankList
            empty="No clicks yet."
            items={stats.sources.map((s) => ({ key: s.source, label: SOURCE[s.source] ?? s.source, value: s.clicks }))}
          />
          {stats.channels.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Shared via</p>
              <RankList
                empty=""
                items={stats.channels.map((ch) => ({
                  key: ch.channel,
                  label: CHANNEL[ch.channel] ?? ch.channel,
                  value: ch.shares,
                }))}
              />
            </div>
          )}
          {stats.kinds.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Link type</p>
              <RankList
                empty=""
                items={stats.kinds.map((k) => ({ key: k.kind, label: KIND[k.kind]?.label ?? k.kind, value: k.clicks }))}
              />
            </div>
          )}
          {stats.countries.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-2 text-[11px] font-bold tracking-wider text-fg-subtle uppercase">Countries</p>
              <RankList
                empty=""
                items={stats.countries.map((c) => ({
                  key: c.country,
                  label: `${flag(c.country)} ${countryName(c.country)}`,
                  value: c.clicks,
                }))}
              />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle icon={Link2} hint="This period · all time">
          Top shared links
        </CardTitle>
        {stats.topLinks.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-subtle">No shared link has been clicked in this period.</p>
        ) : (
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] tracking-wider text-fg-subtle uppercase">
                  <th className="pb-2 font-bold">Title</th>
                  <th className="pb-2 font-bold">Type</th>
                  <th className="pb-2 font-bold">Short link</th>
                  <th className="pb-2 text-right font-bold">Clicks</th>
                  <th className="pb-2 text-right font-bold">All time</th>
                  <th className="pb-2 text-right font-bold">Last click</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.topLinks.map((link) => {
                  const kind = KIND[link.kind] ?? KIND.page;
                  const Icon = kind.icon;
                  return (
                    <tr key={link.code} className="align-middle">
                      <td className="max-w-[16rem] py-2.5 pr-3">
                        <span className="block truncate font-semibold text-foreground" title={link.title}>
                          {link.title}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                            kind.tone,
                          )}
                        >
                          <Icon className="h-3 w-3" aria-hidden />
                          {kind.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <a
                          href={`${origin}/${link.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={link.target}
                          className="inline-flex items-center gap-1 font-mono text-xs text-fg-soft hover:text-brand"
                        >
                          /{link.code}
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-black text-foreground">{formatNumber(link.clicks)}</td>
                      <td className="py-2.5 pr-3 text-right text-fg-muted">
                        {formatNumber(link.allTimeClicks)}
                        <span className="ml-1 text-[11px] text-fg-subtle">
                          · {formatNumber(link.allTimeVisitors)} people
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-xs whitespace-nowrap text-fg-subtle">
                        {link.lastClickAt && now ? timeAgo(link.lastClickAt, now) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
