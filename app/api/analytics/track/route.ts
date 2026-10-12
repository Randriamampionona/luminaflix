import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { lookupGeo } from "@/lib/analytics/geo";
import { clientIpFromHeaders, hashIp, maskIp } from "@/lib/analytics/ip";
import { browserFromUa, deviceFromUa, isBot } from "@/lib/analytics/user-agent";
import type { TrackEvent } from "@/lib/analytics/types";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";

/**
 * Collects analytics events from components/analytics/analytics-tracker.tsx.
 *
 * start → creates ANALYTICS/{sessionId} and bumps ANALYTICS_VISITORS/{key}.visitCount
 * page  → adds the route to visitedPages (+ upgrades the session if the user signed in)
 * ping / end → updates sessionDuration (active seconds) and lastActive
 *
 * Raw IPs are never stored: only a masked IP and a salted hash.
 */
const SESSION_ID_RE = /^[a-z0-9-]{16,64}$/i;
const MAX_PAGES = 50;
const MAX_SESSION_SECONDS = 4 * 60 * 60;
const IGNORED_PATHS = /^\/(analytics|api|_next|sign-in|sign-up)(\/|$)/;

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
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return noContent();

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

    if (event.type === "start" || event.type === "page") {
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
            visitedPages: [path],
            pageViews: 1,
            visitFrequency: visitCount,
            day: now.toDate().toISOString().slice(0, 10),
            startedAt: now,
            lastActive: now,
          });
          return;
        }

        const data = session.data() ?? {};
        const pages: string[] = Array.isArray(data.visitedPages) ? data.visitedPages : [];
        tx.update(sessionRef, {
          lastActive: now,
          pageViews: FieldValue.increment(1),
          ...(pages.length < MAX_PAGES && !pages.includes(path) && { visitedPages: FieldValue.arrayUnion(path) }),
          // Signed in during the session → it becomes an authenticated session.
          ...(userId && !data.userId && { userId, visitorType: "authenticated" }),
        });
      });
      return noContent();
    }

    if (event.type === "ping" || event.type === "end") {
      const seconds = Math.max(0, Math.min(Math.round(Number(event.activeSeconds) || 0), MAX_SESSION_SECONDS));
      await sessionRef.update({ sessionDuration: seconds, lastActive: now }).catch(() => {}); // unknown session: ignore
      return noContent();
    }

    return new Response(null, { status: 400 });
  } catch (error) {
    logFirebaseError("analytics:track", error);
    return noContent(); // analytics must never break the site
  }
}
