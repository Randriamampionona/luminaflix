import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { ADMIN_NO_TRACK_COOKIE, isAdminUserId } from "@/lib/analytics/admin";
import { lookupGeo } from "@/lib/analytics/geo";
import { clientIpFromHeaders, hashIp, maskIp } from "@/lib/analytics/ip";
import { browserFromUa, deviceFromUa, isBot } from "@/lib/analytics/user-agent";
import type { TrackEvent } from "@/lib/analytics/types";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * Collects analytics events from components/analytics/analytics-tracker.tsx.
 *
 * start → creates ANALYTICS/{sessionId} and bumps ANALYTICS_VISITORS/{key}.visitCount
 * page  → one write, no read: page count, current page, new route added to visitedPages
 * ping / end → updates sessionDuration (active seconds) and lastActive
 *
 * Firestore budget: ANALYTICS_MODE = "full" (default) | "light" (no 60 s heartbeats:
 * live visitors rely on page views only) | "off" (nothing is recorded). Server env,
 * takes effect on the next deploy/restart, no rebuild of the client needed.
 *
 * Raw IPs are never stored: only a masked IP and a salted hash.
 */
const SESSION_ID_RE = /^[a-z0-9-]{16,64}$/i;
const MAX_PAGES = 50;
const MAX_SESSION_SECONDS = 4 * 60 * 60;
const IGNORED_PATHS = /^\/(analytics|media-infos|api|_next|sign-in|sign-up|launch)(\/|$)/;

// Basic abuse protection: 300 events per IP per 10 minutes (per server instance).
const hits = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 20_000) hits.clear();
  return recent.length > 300;
}

const noContent = () => new Response(null, { status: 204 });
const ANALYTICS_MODE = process.env.ANALYTICS_MODE === "off" || process.env.ANALYTICS_MODE === "light" ? process.env.ANALYTICS_MODE : "full";

/** The admin's own visits are never counted (signed in, or on a browser the admin used). */
function adminSkip() {
  const res = noContent();
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_NO_TRACK_COOKIE}=1; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
  return res;
}

function cleanPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 300) return null;
  const path = value.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return IGNORED_PATHS.test(path) ? null : path;
}

function cleanReferrer(value: unknown, host: string | null): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.host === host ? null : url.host.slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (ANALYTICS_MODE === "off") return noContent();
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return noContent();
  if (request.headers.get("cookie")?.includes(`${ADMIN_NO_TRACK_COOKIE}=1`)) return noContent();

  const ip = clientIpFromHeaders(request.headers);
  const ipHash = hashIp(ip);
  if (rateLimited(ipHash)) return new Response(null, { status: 429 });

  // sendBeacon posts text/plain, fetch posts JSON: read the body as text either way.
  let event: TrackEvent;
  try {
    event = JSON.parse(await request.text()) as TrackEvent;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!event || typeof event.sessionId !== "string" || !SESSION_ID_RE.test(event.sessionId)) {
    return new Response(null, { status: 400 });
  }

  const FieldValue = admin.firestore.FieldValue;
  const now = admin.firestore.Timestamp.now();

  try {
    const db = getDb();
    const sessionRef = db.collection("ANALYTICS").doc(event.sessionId);
    const { userId } = await auth();
    if (isAdminUserId(userId)) return adminSkip();

    // Page view in a known session: a single write, no read (the browser tells
    // us whether the route is new, so visitedPages stays de-duplicated and capped).
    if (event.type === "page") {
      const path = cleanPath(event.path);
      if (!path) return noContent();
      await sessionRef
        .update({
          lastActive: now,
          online: true,
          leftAt: null,
          currentPage: path,
          pageViews: FieldValue.increment(1),
          ...(event.newPage === true && { visitedPages: FieldValue.arrayUnion(path) }),
          // Signed in during the session → it becomes an authenticated session.
          ...(userId && { userId, visitorType: "authenticated" }),
        })
        .catch(() => {}); // unknown / expired session: ignore
      return noContent();
    }

    if (event.type === "start") {
      const path = cleanPath(event.path);
      if (!path) return noContent();

      const geo = event.type === "start" ? await lookupGeo(request.headers, ip) : null;
      const visitorKey = userId ? `u_${userId}` : `ip_${ipHash}`;
      const visitorRef = db.collection("ANALYTICS_VISITORS").doc(visitorKey);

      await db.runTransaction(async (tx) => {
        const session = await tx.get(sessionRef);

        if (!session.exists) {
          if (event.type !== "start") return; // page event for an unknown/expired session
          const visitor = await tx.get(visitorRef);
          const visitCount = (visitor.data()?.visitCount ?? 0) + 1;
          tx.set(
            visitorRef,
            {
              visitCount,
              visitorType: userId ? "authenticated" : "anonymous",
              userId: userId ?? null,
              lastSeen: now,
              ...(visitor.exists ? {} : { firstSeen: now }),
            },
            { merge: true },
          );
          tx.set(sessionRef, {
            sessionId: event.sessionId,
            visitorType: userId ? "authenticated" : "anonymous",
            userId: userId ?? null,
            ipAddress: maskIp(ip),
            ipHash,
            country: geo?.country ?? "XX",
            city: geo?.city ?? null,
            device: deviceFromUa(ua ?? ""),
            browser: browserFromUa(ua ?? ""),
            referrer: cleanReferrer(event.type === "start" ? event.referrer : null, request.headers.get("host")),
            sessionDuration: 0,
            currentPage: path,
            visitedPages: [path],
            pageViews: 1,
            visitFrequency: visitCount,
            day: now.toDate().toISOString().slice(0, 10),
            startedAt: now,
            lastActive: now,
            online: true,
            leftAt: null,
          });
          return;
        }

        const data = session.data() ?? {};
        const pages: string[] = Array.isArray(data.visitedPages) ? data.visitedPages : [];
        tx.update(sessionRef, {
          lastActive: now,
          online: true,
          leftAt: null,
          currentPage: path,
          pageViews: FieldValue.increment(1),
          ...(pages.length < MAX_PAGES && !pages.includes(path) && { visitedPages: FieldValue.arrayUnion(path) }),
          // Signed in during the session → it becomes an authenticated session.
          ...(userId && !data.userId && { userId, visitorType: "authenticated" }),
        });
      });
      return noContent();
    }

    if (event.type === "ping" && ANALYTICS_MODE === "light") return noContent();

    if (event.type === "ping" || event.type === "end") {
      const seconds = Math.max(0, Math.min(Math.round(Number(event.activeSeconds) || 0), MAX_SESSION_SECONDS));
      // ping = still here (visible tab) · end = tab hidden or closed → offline right away.
      const presence = event.type === "end" ? { online: false, leftAt: now } : { online: true, leftAt: null };
      await sessionRef.update({ sessionDuration: seconds, lastActive: now, ...presence }).catch(() => {}); // unknown session: ignore
      return noContent();
    }

    return new Response(null, { status: 400 });
  } catch (error) {
    logFirebaseError("analytics:track", error);
    return noContent(); // analytics must never break the site
  }
}
