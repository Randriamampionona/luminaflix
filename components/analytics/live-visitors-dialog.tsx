"use client";

import {
  ChevronDown,
  Clock,
  ExternalLink,
  Eye,
  Globe2,
  Link2,
  MapPin,
  Monitor,
  Network,
  Repeat,
  ShieldAlert,
  ShieldQuestion,
  Smartphone,
  Tablet,
  UserCheck,
  UserRound,
  Clock3,
  X,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LiveSession } from "@/lib/analytics/queries";
import { MessageVisitorButton, VisitorChatPanel } from "@/components/admin/analytics-visitor-item";
import { cn } from "@/lib/utils";
import { countryName, flag, formatDuration, formatNumber } from "./format";

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet } as const;
/**
 * Live list refresh (each poll reads only the visitors active right now):
 * every 15 s while the popup is open, every 60 s for the badge otherwise.
 */
const POLL_OPEN_MS = 15_000;
const POLL_CLOSED_MS = 60_000;
type Filter = "all" | "authenticated" | "anonymous";

function secondsAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)} min ago`;
}

function Meta({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-fg-faint">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-fg-soft">{children}</p>
    </div>
  );
}

function VisitorCard({
  session,
  now,
  expanded,
  onToggle,
}: {
  session: LiveSession;
  now: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsId = useId();
  const [chatOpen, setChatOpen] = useState(false);
  // VPN: reputation of the IP, or the device's time zone in another country than the IP.
  const tzMismatch =
    !!session.timeZoneCountry && session.country !== "XX" && session.timeZoneCountry !== session.country;
  const vpnState = session.vpn?.detected ? "vpn" : tzMismatch ? "possible" : null;
  const vpnLabel = session.vpn?.type && session.vpn.type !== "VPN" ? session.vpn.type : "VPN";
  const DeviceIcon = DEVICE_ICON[session.device as keyof typeof DEVICE_ICON] ?? Monitor;
  const signedIn = session.visitorType === "authenticated";
  // Heartbeats arrive every 60 s while the tab is visible: older than 90 s = probably leaving.
  const idle = now - Date.parse(session.lastActive) > 90_000;
  const title = signedIn ? (session.name ?? session.email ?? session.userId) : session.ipAddress;

  return (
    <li className="rounded-2xl border border-line bg-tint-soft p-4 transition-colors hover:border-cyan-500/30">
      <div className="flex items-start gap-3">
        {/* Avatar with country flag */}
        <div className="relative shrink-0">
          {signedIn && session.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar
            <img src={session.imageUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                signedIn ? "bg-cyan-500/15 text-brand" : "bg-tint-strong text-fg-muted",
              )}
            >
              {signedIn ? (
                <span className="text-sm font-black">{(title ?? "?")[0]?.toUpperCase()}</span>
              ) : (
                <DeviceIcon className="h-5 w-5" aria-hidden />
              )}
            </span>
          )}
          <span className="absolute -right-1 -bottom-1 text-base leading-none" title={countryName(session.country)}>
            {flag(session.country)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("truncate font-bold text-foreground", !signedIn && "font-mono text-sm")}>{title}</p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                signedIn ? "bg-cyan-500/15 text-brand" : "bg-tint-strong text-fg-muted",
              )}
            >
              {signedIn ? <UserCheck className="h-3 w-3" aria-hidden /> : <UserRound className="h-3 w-3" aria-hidden />}
              {signedIn ? "Signed in" : "Anonymous"}
            </span>
            {vpnState && (
              <span
                title={
                  vpnState === "vpn"
                    ? [session.vpn?.type, session.vpn?.provider].filter(Boolean).join(" · ") || "VPN / proxy"
                    : `Device time zone in ${countryName(session.timeZoneCountry ?? "XX")}, IP in ${countryName(session.country)}`
                }
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  vpnState === "vpn"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : "border border-amber-500/40 text-amber-600 dark:text-amber-400",
                )}
              >
                {vpnState === "vpn" ? (
                  <ShieldAlert className="h-3 w-3" aria-hidden />
                ) : (
                  <ShieldQuestion className="h-3 w-3" aria-hidden />
                )}
                {vpnState === "vpn" ? vpnLabel : "Possible VPN"}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-subtle">
            {signedIn && session.email && session.name ? `${session.email} · ` : ""}
            {countryName(session.country)}
            {vpnState && session.timeZoneCountry && tzMismatch && (
              <> (device in {countryName(session.timeZoneCountry)})</>
            )}{" "}
            · <span className="capitalize">{session.device}</span> · {session.browser} ·{" "}
            {formatDuration(session.sessionDuration)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[11px] text-fg-subtle" title={new Date(session.lastActive).toLocaleString()}>
            {secondsAgo(session.lastActive, now)}
          </span>
          <MessageVisitorButton open={chatOpen} onToggle={() => setChatOpen((v) => !v)} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
              expanded
                ? "border-cyan-500/40 bg-cyan-500/10 text-brand"
                : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
            )}
          >
            Details
            <ChevronDown
              className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {/* Live chat with this visitor (admin) */}
      {chatOpen && (
        <VisitorChatPanel
          sessionId={session.sessionId}
          visitorLabel={signedIn ? (session.name ?? session.email ?? "this visitor") : session.ipAddress}
        />
      )}

      {/* Current page */}
      <a
        href={session.currentPage}
        target="_blank"
        rel="noreferrer"
        className="group mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs transition-colors hover:border-cyan-500/40"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          {!idle && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          )}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", idle ? "bg-amber-500" : "bg-emerald-500")} />
        </span>
        <span className="shrink-0 font-bold text-fg-subtle">{idle ? "Last seen on" : "Viewing"}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-foreground">{session.currentPage}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-fg-faint group-hover:text-brand" aria-hidden />
      </a>

      {/* Details: collapsed by default (animated height via grid rows) */}
      <div
        id={detailsId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-3 sm:grid-cols-4">
            <Meta icon={MapPin} label="Location">
              {countryName(session.country)}
              {session.city ? ` · ${session.city}` : ""}
            </Meta>
            <Meta icon={DeviceIcon} label="Device">
              <span className="capitalize">{session.device}</span> · {session.browser}
            </Meta>
            <Meta icon={Globe2} label="IP (masked)">
              <span className="font-mono">{session.ipAddress}</span>
            </Meta>
            <Meta icon={Clock} label="Session">
              {formatDuration(session.sessionDuration)} ·{" "}
              {new Date(session.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Meta>
            <Meta icon={Repeat} label="Total visits">
              {formatNumber(session.visitFrequency)}
            </Meta>
            <Meta icon={Eye} label="Page views">
              {formatNumber(session.pageViews)}
            </Meta>
            <Meta icon={Link2} label="Came from">
              {session.referrer ?? "Direct"}
            </Meta>
            <Meta icon={Network} label="Network">
              {session.vpn
                ? session.vpn.detected
                  ? [vpnLabel, session.vpn.provider].filter(Boolean).join(" · ")
                  : "Regular connection"
                : "Not checked"}
            </Meta>
            <Meta icon={Clock3} label="Device time zone">
              {session.timeZone ? (
                <span className={cn(tzMismatch && "text-amber-600 dark:text-amber-400")}>
                  {session.timeZoneCountry ? `${flag(session.timeZoneCountry)} ` : ""}
                  {session.timeZone.replace(/_/g, " ")}
                </span>
              ) : (
                "—"
              )}
            </Meta>
            {signedIn && session.userId && (
              <Meta icon={UserCheck} label="User id">
                <span className="font-mono">{session.userId}</span>
              </Meta>
            )}
          </div>

          {session.pages.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-fg-faint">Path</span>
              {session.pages.map((page, i) => (
                <span key={page} className="flex items-center gap-1">
                  {i > 0 && <span className="text-fg-faint">→</span>}
                  <span className="rounded-md bg-tint-strong px-1.5 py-0.5 font-mono text-[10px] text-fg-soft">
                    {page}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * "N active now" badge that opens a popup with every visitor active in the
 * last 5 minutes: who (user or masked IP), where, device, current page,
 * session length and path. Data comes from the dashboard's 30 s refresh.
 */
export default function LiveVisitorsDialog({
  sessions: initialSessions,
  generatedAt,
}: {
  sessions: LiveSession[];
  /** When the server rendered `sessions`. */
  generatedAt: string;
}) {
  // Newest data wins: the poll below, or a fresher dashboard refresh.
  const [polled, setPolled] = useState<{ at: number; live: LiveSession[] } | null>(null);
  const sessions = polled && polled.at > Date.parse(generatedAt) ? polled.live : initialSessions;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/analytics/live", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { live: LiveSession[]; generatedAt: string };
        if (active) setPolled({ at: Date.parse(data.generatedAt), live: data.live });
      } catch {
        // offline / server error: keep the last list
      }
    };
    // Opening the popup refreshes right away.
    if (open) void poll();
    const timer = setInterval(poll, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [open]);

  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [now, setNow] = useState(() => Date.now());

  // Keep "12s ago" labels ticking while the popup is open.
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);

  const signedIn = sessions.filter((s) => s.visitorType === "authenticated").length;
  const visible = filter === "all" ? sessions : sessions.filter((s) => s.visitorType === filter);
  const allExpanded = visible.length > 0 && visible.every((s) => expanded.has(s.sessionId));
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: sessions.length },
    { key: "authenticated", label: "Signed in", count: signedIn },
    { key: "anonymous", label: "Anonymous", count: sessions.length - signedIn },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNow(Date.now());
          setOpen(true);
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-600 transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-400"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {formatNumber(sessions.length)} active now
        <span className="text-[10px] font-semibold opacity-70">· view</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="z-110 flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border-line-strong bg-surface p-0 sm:max-w-3xl"
        >
          <div className="relative shrink-0 border-b border-line px-5 pt-5 pb-4 sm:px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl"
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  Live visitors
                  <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-sm text-emerald-600 dark:text-emerald-400">
                    {formatNumber(sessions.length)}
                  </span>
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-fg-subtle">
                  On the site right now · updates every 15 s
                </DialogDescription>
              </div>
              <DialogClose
                aria-label="Close"
                className="cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>

            <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex w-fit rounded-xl border border-line-strong bg-tint p-1">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      filter === f.key ? "bg-surface text-foreground shadow" : "text-fg-muted hover:text-foreground",
                    )}
                  >
                    {f.label}
                    <span className="rounded-md bg-tint-strong px-1.5 text-[10px]">{f.count}</span>
                  </button>
                ))}
              </div>
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(allExpanded ? new Set() : new Set(visible.map((v) => v.sessionId)))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-fg-muted transition-colors hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", allExpanded && "rotate-180")}
                    aria-hidden
                  />
                  {allExpanded ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint-strong text-fg-faint">
                  <UserRound className="h-6 w-6" aria-hidden />
                </span>
                <p className="text-sm font-bold text-foreground">Nobody here right now</p>
                <p className="text-xs text-fg-subtle">Visitors appear here as soon as they open a page.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {visible.map((session) => (
                  <VisitorCard
                    key={session.sessionId}
                    session={session}
                    now={now}
                    expanded={expanded.has(session.sessionId)}
                    onToggle={() => toggle(session.sessionId)}
                  />
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
