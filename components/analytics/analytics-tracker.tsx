"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ANALYTICS_SESSION_KEY } from "@/lib/analytics/client-session";

/**
 * Privacy-friendly page tracking → /api/analytics/track.
 *
 * - One session per tab; a new session starts after 30 min of inactivity.
 * - Session duration = time the tab was actually visible (not idle background tabs).
 * - Heartbeat every 60 s while visible; "end" (sendBeacon) as soon as the tab is
 *   hidden or closed, so the live view knows the visitor left; "ping" again when
 *   the tab becomes visible.
 * - Skips /analytics, /media-infos, /launch and /bot-filter. Set NEXT_PUBLIC_ANALYTICS_RESPECT_DNT=1 to also
 *   skip browsers sending Do Not Track / Global Privacy Control (Brave and
 *   Firefox private windows send GPC by default).
 * - In development, every event is logged to the browser console.
 */
const ENDPOINT = "/api/analytics/track";
const SESSION_KEY = ANALYTICS_SESSION_KEY;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
/**
 * Presence heartbeat (1 Firestore write each): the live view drops a visitor
 * ~2.5 min after the last one (lib/analytics/queries.ts LIVE_WINDOW_MS).
 */
const HEARTBEAT_MS = 60 * 1000;
/** Routes remembered per session (same cap as the server). */
const MAX_PAGES = 50;

type StoredSession = {
  id: string;
  lastSeen: number;
  activeMs: number;
  /** Routes already recorded in this session: lets the server skip a read per page view. */
  pages?: string[];
};

/** UUID v4 — crypto.randomUUID() is missing on older TV browsers (Chromium < 92). */
function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Records `path` in the session; true if it's the first visit of this route. */
function markPage(s: StoredSession, path: string) {
  const pages = s.pages ?? [];
  if (pages.includes(path) || pages.length >= MAX_PAGES) return false;
  s.pages = [...pages, path];
  return true;
}

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage blocked: session lasts for this page only
  }
}

function send(body: object, beacon = false) {
  const payload = JSON.stringify(body);
  if (process.env.NODE_ENV === "development") console.info("[analytics] →", body);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }));
    return;
  }
  void fetch(ENDPOINT, {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => {
      if (!res.ok) console.warn(`[analytics] ${ENDPOINT} answered ${res.status}`);
    })
    .catch(() => {});
}

const optedOut = () =>
  process.env.NEXT_PUBLIC_ANALYTICS_RESPECT_DNT === "1" &&
  (navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true);

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const session = useRef<StoredSession | null>(null);
  const visibleSince = useRef<number | null>(null);
  const started = useRef(false);

  const activeSeconds = () => {
    const s = session.current;
    if (!s) return 0;
    const running = visibleSince.current ? Date.now() - visibleSince.current : 0;
    return Math.round((s.activeMs + running) / 1000);
  };

  const persist = () => {
    const s = session.current;
    if (!s) return;
    if (visibleSince.current) {
      s.activeMs += Date.now() - visibleSince.current;
      visibleSince.current = document.visibilityState === "visible" ? Date.now() : null;
    }
    s.lastSeen = Date.now();
    writeSession(s);
  };

  // Page views (and session start on the first one).
  useEffect(() => {
    // Admin pages and the launch screen are never tracked.
    if (optedOut() || pathname.startsWith("/analytics") || pathname.startsWith("/media-infos") || pathname === "/launch" || pathname === "/bot-filter") return;

    if (!started.current) {
      started.current = true;
      const existing = readSession();
      const fresh = !existing || Date.now() - existing.lastSeen > SESSION_TIMEOUT_MS;
      session.current = fresh ? { id: uuid(), lastSeen: Date.now(), activeMs: 0 } : existing;
      markPage(session.current, pathname);
      visibleSince.current = document.visibilityState === "visible" ? Date.now() : null;
      writeSession(session.current);
      send({
        type: "start",
        sessionId: session.current.id,
        path: pathname,
        referrer: document.referrer || null,
        // Device time zone: compared with the IP's country to spot VPNs.
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      return;
    }
    if (!session.current) return;
    const newPage = markPage(session.current, pathname);
    persist();
    send({ type: "page", sessionId: session.current.id, path: pathname, newPage });
  }, [pathname]);

  // Active time: heartbeat while visible, final beacon when hidden / closed.
  useEffect(() => {
    if (optedOut()) return;

    const flush = () => {
      if (!session.current) return;
      const seconds = activeSeconds();
      persist();
      send({ type: "end", sessionId: session.current.id, activeSeconds: seconds }, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flush();
        visibleSince.current = null;
      } else {
        visibleSince.current = Date.now();
        // Back on the tab: mark the visitor online again right away.
        if (session.current) send({ type: "ping", sessionId: session.current.id, activeSeconds: activeSeconds() });
      }
    };
    const heartbeat = setInterval(() => {
      if (!session.current || document.visibilityState !== "visible") return;
      persist();
      send({ type: "ping", sessionId: session.current.id, activeSeconds: activeSeconds() });
    }, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
