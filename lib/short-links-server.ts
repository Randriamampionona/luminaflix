import "server-only";
import { createHash } from "node:crypto";
import admin from "firebase-admin";
import { unstable_cache } from "next/cache";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import { SHORT_CODE_RE, type ShortLinkKind } from "@/lib/short-links";

/**
 * Short links in Firestore (free-plan friendly):
 *
 *   SHORT_LINKS/{code}        target, kind, title, mediaKind, mediaId, createdAt,
 *                             clicks (counter), visitors (hashed IPs), lastClickAt
 *   SHORT_LINK_DAILY/{day}    total, visitors[], codes.{code}, kinds.{kind},
 *                             sources.{source}, countries.{CC}   (one doc per day)
 *
 * Codes are derived from the target (same movie link → same code), so sharing
 * the same title again reuses its link. Creating costs 1 read + 1 write once;
 * after that everything is served from the Next.js cache. A click costs 2 writes.
 */
const LINKS = "SHORT_LINKS";
const DAILY = "SHORT_LINK_DAILY";
const TIME_ZONE = process.env.ANALYTICS_TIME_ZONE || "Europe/Paris";
const CACHE_SECONDS = 30 * 24 * 3600;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

interface ShortLinkMeta {
  kind: ShortLinkKind;
  title: string;
  mediaKind: string;
  mediaId: string | null;
}

/** Deterministic 7-char code for a target (attempt > 0 on a collision). */
function codeFor(target: string, attempt: number) {
  const bytes = createHash("sha256")
    .update(attempt ? `${target}#${attempt}` : target)
    .digest();
  let code = "";
  for (let i = 0; i < 7; i++) code += BASE62[bytes[i] % 62];
  // Always at least one digit, so a code can never be a page name.
  if (!/\d/.test(code)) code = code.slice(0, 6) + String(bytes[7] % 10);
  return code;
}

async function createOrGet(target: string, meta: ShortLinkMeta): Promise<string> {
  const col = getDb().collection(LINKS);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = codeFor(target, attempt);
    const ref = col.doc(code);
    const snap = await ref.get();
    if (snap.exists) {
      if (snap.get("target") === target) return code;
      continue; // another target already uses this code
    }
    try {
      await ref.create({
        code,
        target,
        kind: meta.kind,
        title: meta.title.slice(0, 200),
        mediaKind: meta.mediaKind,
        mediaId: meta.mediaId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        clicks: 0,
        visitors: [],
        lastClickAt: null,
      });
      return code;
    } catch {
      // created at the same moment by another request: read it again
      const again = await ref.get();
      if (again.get("target") === target) return code;
    }
  }
  throw new Error("short-links: no free code");
}

/** Short code for a target (cached: Firestore is only touched the first time). */
export function getShortCode(target: string, meta: ShortLinkMeta) {
  return unstable_cache(() => createOrGet(target, meta), ["short-link-v1", target], { revalidate: CACHE_SECONDS })();
}

/** Target of a code, or null (cached; null too if Firestore can't be reached). */
export async function resolveShortCode(code: string): Promise<string | null> {
  if (!SHORT_CODE_RE.test(code)) return null;
  try {
    return await resolveCached(code);
  } catch (error) {
    logFirebaseError("short-links:resolve", error);
    return null;
  }
}

function resolveCached(code: string): Promise<string | null> {
  return unstable_cache(
    async () => {
      const snap = await getDb().collection(LINKS).doc(code).get();
      return snap.exists ? (snap.get("target") as string) : null;
    },
    ["short-link-target-v1", code],
    { revalidate: CACHE_SECONDS },
  )();
}

function localDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Where the click came from (in-app browsers and referrers). */
export function clickSource(userAgent: string, referrer: string | null) {
  const ua = userAgent;
  const ref = referrer ?? "";
  if (/Instagram/i.test(ua) || /instagram\./i.test(ref)) return "instagram";
  if (/Messenger|MessengerForiOS|FB_IAB\/MESSENGER/i.test(ua) || /messenger\.com/i.test(ref)) return "messenger";
  if (/FBAN|FBAV|FB_IAB/i.test(ua) || /facebook\.|fb\.com/i.test(ref)) return "facebook";
  if (/WhatsApp/i.test(ua) || /whatsapp\./i.test(ref)) return "whatsapp";
  if (/Telegram/i.test(ua) || /t\.me|telegram\./i.test(ref)) return "telegram";
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua) || /tiktok\./i.test(ref)) return "tiktok";
  if (/Twitter/i.test(ua) || /t\.co|twitter\.|x\.com/i.test(ref)) return "x";
  return ref ? "other" : "direct";
}

/** Records one click (2 writes). Never throws. */
export async function recordShortLinkClick(
  code: string,
  { ipHash, country, source }: { ipHash: string; country: string; source: string },
) {
  try {
    const db = getDb();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const inc = admin.firestore.FieldValue.increment(1);
    const link = db.collection(LINKS).doc(code);
    const kind = (await resolveKind(code)) ?? "page";
    const day = localDay();
    const batch = db.batch();
    batch.update(link, {
      clicks: inc,
      lastClickAt: now,
      visitors: admin.firestore.FieldValue.arrayUnion(ipHash),
    });
    batch.set(
      db.collection(DAILY).doc(day),
      {
        day,
        total: inc,
        visitors: admin.firestore.FieldValue.arrayUnion(ipHash),
        codes: { [code]: inc },
        kinds: { [kind]: inc },
        sources: { [source]: inc },
        countries: { [country || "XX"]: inc },
      },
      { merge: true },
    );
    await batch.commit();
  } catch (error) {
    logFirebaseError("short-links:click", error);
  }
}

function resolveKind(code: string): Promise<ShortLinkKind | null> {
  return unstable_cache(
    async () => {
      const snap = await getDb().collection(LINKS).doc(code).get();
      return (snap.get("kind") as ShortLinkKind) ?? null;
    },
    ["short-link-kind-v1", code],
    { revalidate: CACHE_SECONDS },
  )();
}

// ------------------------------------------------------------------ stats --

export interface ShortLinkStats {
  totalClicks: number;
  uniqueVisitors: number;
  linksClicked: number;
  linksCreated: number;
  series: { day: string; clicks: number; visitors: number }[];
  kinds: { kind: ShortLinkKind; clicks: number }[];
  sources: { source: string; clicks: number }[];
  countries: { country: string; clicks: number }[];
  topLinks: {
    code: string;
    title: string;
    kind: ShortLinkKind;
    target: string;
    clicks: number;
    allTimeClicks: number;
    allTimeVisitors: number;
    lastClickAt: string | null;
  }[];
}

const EMPTY: ShortLinkStats = {
  totalClicks: 0,
  uniqueVisitors: 0,
  linksClicked: 0,
  linksCreated: 0,
  series: [],
  kinds: [],
  sources: [],
  countries: [],
  topLinks: [],
};

function daysBetween(fromDay: string, toDay: string) {
  const days: string[] = [];
  const d = new Date(`${fromDay}T12:00:00Z`);
  const end = new Date(`${toDay}T12:00:00Z`);
  while (d <= end && days.length < 400) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

const sortDesc = <T extends { clicks: number }>(rows: T[]) => rows.sort((a, b) => b.clicks - a.clicks);

async function fetchStats(fromDay: string, toDay: string): Promise<ShortLinkStats> {
  const db = getDb();
  const days = daysBetween(fromDay, toDay);
  const snaps = await db.getAll(...days.map((d) => db.collection(DAILY).doc(d)));

  const visitors = new Set<string>();
  const codes = new Map<string, number>();
  const kinds = new Map<string, number>();
  const sources = new Map<string, number>();
  const countries = new Map<string, number>();
  let totalClicks = 0;
  const series = snaps.map((snap, i) => {
    const data = snap.data() ?? {};
    const dayVisitors: string[] = data.visitors ?? [];
    dayVisitors.forEach((v) => visitors.add(v));
    totalClicks += data.total ?? 0;
    const add = (map: Map<string, number>, obj?: Record<string, number>) =>
      Object.entries(obj ?? {}).forEach(([k, v]) => map.set(k, (map.get(k) ?? 0) + v));
    add(codes, data.codes);
    add(kinds, data.kinds);
    add(sources, data.sources);
    add(countries, data.countries);
    return { day: days[i], clicks: data.total ?? 0, visitors: dayVisitors.length };
  });

  const top = [...codes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const linkSnaps = top.length ? await db.getAll(...top.map(([code]) => db.collection(LINKS).doc(code))) : [];
  const created = await db.collection(LINKS).count().get();

  return {
    totalClicks,
    uniqueVisitors: visitors.size,
    linksClicked: codes.size,
    linksCreated: created.data().count,
    series,
    kinds: sortDesc([...kinds.entries()].map(([kind, clicks]) => ({ kind: kind as ShortLinkKind, clicks }))),
    sources: sortDesc([...sources.entries()].map(([source, clicks]) => ({ source, clicks }))),
    countries: sortDesc([...countries.entries()].map(([country, clicks]) => ({ country, clicks }))).slice(0, 8),
    topLinks: top.map(([code, clicks], i) => {
      const d = linkSnaps[i]?.data() ?? {};
      const last = d.lastClickAt as admin.firestore.Timestamp | null | undefined;
      return {
        code,
        clicks,
        title: d.title ?? "(deleted)",
        kind: (d.kind as ShortLinkKind) ?? "page",
        target: d.target ?? "",
        allTimeClicks: d.clicks ?? clicks,
        allTimeVisitors: Array.isArray(d.visitors) ? d.visitors.length : 0,
        lastClickAt: last ? last.toDate().toISOString() : null,
      };
    }),
  };
}

/** Dashboard data for a range of local days (cached 2 min, like the rest of /analytics). */
export async function getShortLinkStats(fromDay: string, toDay: string): Promise<ShortLinkStats> {
  try {
    return await unstable_cache(() => fetchStats(fromDay, toDay), ["short-link-stats-v1", fromDay, toDay], {
      revalidate: 120,
    })();
  } catch (error) {
    logFirebaseError("short-links:stats", error);
    return EMPTY;
  }
}
