import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import type { AnalyticsSession } from "./types";

/** Day boundaries and chart buckets use this zone (override with ANALYTICS_TIME_ZONE). */
const ANALYTICS_TIME_ZONE = process.env.ANALYTICS_TIME_ZONE || "Europe/Paris";
const MAX_SESSIONS = 10_000;
const LIVE_WINDOW_MS = 5 * 60 * 1000;

export type RangeKey = "today" | "7d" | "30d" | "custom";

interface ResolvedRange {
  key: RangeKey;
  from: Date;
  to: Date;
  /** Inclusive local days, "YYYY-MM-DD". */
  fromDay: string;
  toDay: string;
}

// ------------------------------------------------------------- dates ----

function zoneOffsetMs(ms: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Local "YYYY-MM-DD" of an instant. */
function localDay(date: Date, timeZone = ANALYTICS_TIME_ZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Midnight (local) of a "YYYY-MM-DD" day, as an instant. */
function startOfLocalDay(day: string, timeZone = ANALYTICS_TIME_ZONE) {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - zoneOffsetMs(guess - zoneOffsetMs(guess, timeZone), timeZone));
}

function addDays(day: string, n: number) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveRange(params: { range?: string; from?: string; to?: string }): ResolvedRange {
  const today = localDay(new Date());
  let key: RangeKey =
    params.range === "today" || params.range === "30d" || params.range === "custom" ? params.range : "7d";
  let fromDay = today;
  let toDay = today;

  if (key === "7d") fromDay = addDays(today, -6);
  if (key === "30d") fromDay = addDays(today, -29);
  if (key === "custom") {
    if (params.from && params.to && DAY_RE.test(params.from) && DAY_RE.test(params.to)) {
      [fromDay, toDay] = params.from <= params.to ? [params.from, params.to] : [params.to, params.from];
      if (toDay > today) toDay = today;
      // Keep custom ranges reasonable (max 1 year).
      if (addDays(fromDay, 366) < toDay) fromDay = addDays(toDay, -366);
    } else {
      key = "7d";
      fromDay = addDays(today, -6);
    }
  }

  return { key, fromDay, toDay, from: startOfLocalDay(fromDay), to: startOfLocalDay(addDays(toDay, 1)) };
}

// ------------------------------------------------------------ results ---

export interface VisitorRow {
  key: string;
  /** anonymous: masked IP · authenticated: Clerk user id */
  label: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  country: string;
  city: string | null;
  device: string;
  browser: string;
  sessions: number;
  visitFrequency: number;
  totalDuration: number;
  avgDuration: number;
  pageViews: number;
  pages: string[];
  lastActive: string;
}

export interface AnalyticsData {
  range: { key: RangeKey; fromDay: string; toDay: string };
  generatedAt: string;
  truncated: boolean;
  liveNow: number;
  kpis: {
    uniqueVisitors: number;
    sessions: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    authenticatedShare: number;
  };
  series: { day: string; visitors: number; sessions: number; pageViews: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  countries: { country: string; visitors: number; sessions: number }[];
  devices: { device: string; sessions: number }[];
  browsers: { browser: string; sessions: number }[];
  anonymous: VisitorRow[];
  authenticated: VisitorRow[];
}

type SessionDoc = Omit<AnalyticsSession, "startedAt" | "lastActive"> & {
  startedAt: admin.firestore.Timestamp;
  lastActive: admin.firestore.Timestamp;
};

const top = <T>(map: Map<string, T>, score: (v: T) => number, n: number) =>
  [...map.entries()].sort((a, b) => score(b[1]) - score(a[1])).slice(0, n);

async function clerkProfiles(userIds: string[]) {
  const profiles = new Map<string, { name: string | null; email: string | null; imageUrl: string | null }>();
  if (userIds.length === 0) return profiles;
  try {
    const client = await clerkClient();
    for (let i = 0; i < userIds.length; i += 100) {
      const { data } = await client.users.getUserList({ userId: userIds.slice(i, i + 100), limit: 100 });
      for (const user of data) {
        const email =
          user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
          user.emailAddresses[0]?.emailAddress ??
          null;
        profiles.set(user.id, {
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null,
          email,
          imageUrl: user.imageUrl || null,
        });
      }
    }
  } catch (error) {
    console.error("[analytics] Clerk profile lookup failed", error);
  }
  return profiles;
}

// --------------------------------------------------------- aggregate ---

export async function getAnalyticsData(range: ResolvedRange): Promise<AnalyticsData> {
  const db = getDb();
  const col = db.collection("ANALYTICS");
  const Timestamp = admin.firestore.Timestamp;

  let docs: SessionDoc[] = [];
  let liveNow = 0;
  try {
    const [snapshot, live] = await Promise.all([
      col
        .where("startedAt", ">=", Timestamp.fromDate(range.from))
        .where("startedAt", "<", Timestamp.fromDate(range.to))
        .orderBy("startedAt", "desc")
        .limit(MAX_SESSIONS)
        .get(),
      col
        .where("lastActive", ">=", Timestamp.fromMillis(Date.now() - LIVE_WINDOW_MS))
        .count()
        .get(),
    ]);
    docs = snapshot.docs.map((d) => d.data() as SessionDoc);
    liveNow = live.data().count;
  } catch (error) {
    logFirebaseError("analytics:query", error);
  }

  // Empty day buckets so the chart shows the whole range.
  const series = new Map<string, { visitors: Set<string>; sessions: number; pageViews: number }>();
  for (let day = range.fromDay; day <= range.toDay; day = addDays(day, 1)) {
    series.set(day, { visitors: new Set(), sessions: 0, pageViews: 0 });
  }

  const visitors = new Set<string>();
  const pages = new Map<string, { views: number; visitors: Set<string> }>();
  const countries = new Map<string, { visitors: Set<string>; sessions: number }>();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const rows = new Map<string, VisitorRow & { _pages: Set<string>; _anon: boolean }>();

  let totalDuration = 0;
  let pageViews = 0;
  let bounces = 0;
  let authenticatedSessions = 0;

  for (const s of docs) {
    const visitorKey = s.userId ? `u_${s.userId}` : `ip_${s.ipHash}`;
    const day = localDay(s.startedAt.toDate());
    const views = s.pageViews || s.visitedPages?.length || 1;
    const duration = s.sessionDuration || 0;

    visitors.add(visitorKey);
    totalDuration += duration;
    pageViews += views;
    if (views <= 1) bounces += 1;
    if (s.userId) authenticatedSessions += 1;

    const bucket = series.get(day);
    if (bucket) {
      bucket.visitors.add(visitorKey);
      bucket.sessions += 1;
      bucket.pageViews += views;
    }

    for (const path of s.visitedPages ?? []) {
      const p = pages.get(path) ?? { views: 0, visitors: new Set<string>() };
      p.views += 1;
      p.visitors.add(visitorKey);
      pages.set(path, p);
    }

    const c = countries.get(s.country || "XX") ?? { visitors: new Set<string>(), sessions: 0 };
    c.visitors.add(visitorKey);
    c.sessions += 1;
    countries.set(s.country || "XX", c);

    devices.set(s.device || "desktop", (devices.get(s.device || "desktop") ?? 0) + 1);
    browsers.set(s.browser || "Other", (browsers.get(s.browser || "Other") ?? 0) + 1);

    // Sessions arrive newest first: the first one seen for a visitor is their latest.
    const row = rows.get(visitorKey);
    if (!row) {
      rows.set(visitorKey, {
        key: visitorKey,
        label: s.userId ?? s.ipAddress,
        name: null,
        email: null,
        imageUrl: null,
        country: s.country || "XX",
        city: s.city ?? null,
        device: s.device,
        browser: s.browser,
        sessions: 1,
        visitFrequency: s.visitFrequency || 1,
        totalDuration: duration,
        avgDuration: 0,
        pageViews: views,
        pages: [],
        lastActive: s.lastActive.toDate().toISOString(),
        _pages: new Set(s.visitedPages ?? []),
        _anon: !s.userId,
      });
    } else {
      row.sessions += 1;
      row.totalDuration += duration;
      row.pageViews += views;
      row.visitFrequency = Math.max(row.visitFrequency, s.visitFrequency || 1);
      for (const path of s.visitedPages ?? []) row._pages.add(path);
    }
  }

  const finalRows = [...rows.values()].map(({ _pages, _anon, ...row }) => ({
    anonymous: _anon,
    row: { ...row, avgDuration: Math.round(row.totalDuration / row.sessions), pages: [..._pages].slice(0, 30) },
  }));

  const authRows = finalRows.filter((r) => !r.anonymous).map((r) => r.row);
  const profiles = await clerkProfiles(authRows.map((r) => r.label));
  for (const row of authRows) {
    const p = profiles.get(row.label);
    if (p) Object.assign(row, p);
  }

  const sessions = docs.length;
  return {
    range: { key: range.key, fromDay: range.fromDay, toDay: range.toDay },
    generatedAt: new Date().toISOString(),
    truncated: docs.length >= MAX_SESSIONS,
    liveNow,
    kpis: {
      uniqueVisitors: visitors.size,
      sessions,
      pageViews,
      avgSessionDuration: sessions ? Math.round(totalDuration / sessions) : 0,
      bounceRate: sessions ? bounces / sessions : 0,
      authenticatedShare: sessions ? authenticatedSessions / sessions : 0,
    },
    series: [...series.entries()].map(([day, v]) => ({
      day,
      visitors: v.visitors.size,
      sessions: v.sessions,
      pageViews: v.pageViews,
    })),
    topPages: top(pages, (p) => p.views, 10).map(([path, p]) => ({ path, views: p.views, visitors: p.visitors.size })),
    countries: top(countries, (c) => c.visitors.size, 12).map(([country, c]) => ({
      country,
      visitors: c.visitors.size,
      sessions: c.sessions,
    })),
    devices: top(devices, (n) => n, 5).map(([device, n]) => ({ device, sessions: n })),
    browsers: top(browsers, (n) => n, 6).map(([browser, n]) => ({ browser, sessions: n })),
    anonymous: finalRows
      .filter((r) => r.anonymous)
      .map((r) => r.row)
      .slice(0, 500),
    authenticated: authRows.slice(0, 500),
  };
}
