"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Privacy-friendly page tracking → /api/analytics/track.
 *
 * - One session per tab; a new session starts after 30 min of inactivity.
 * - Session duration = time the tab was actually visible (not idle background tabs).
 * - Heartbeat every 60 s while visible; final duration sent with sendBeacon
 *   when the tab is hidden or closed.
 * - Respects Do Not Track / Global Privacy Control, skips /analytics itself.
 */
const ENDPOINT = "/api/analytics/track";
const SESSION_KEY = "lf_analytics_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;

type StoredSession = { id: string; lastSeen: number; activeMs: number };

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
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }));
    return;
  }
  void fetch(ENDPOINT, {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

const optedOut = () =>
  navigator.doNotTrack === "1" ||
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

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
    if (optedOut() || pathname.startsWith("/analytics")) return;

    if (!started.current) {
      started.current = true;
      const existing = readSession();
      const fresh = !existing || Date.now() - existing.lastSeen > SESSION_TIMEOUT_MS;
      session.current = fresh ? { id: crypto.randomUUID(), lastSeen: Date.now(), activeMs: 0 } : existing;
      visibleSince.current = document.visibilityState === "visible" ? Date.now() : null;
      writeSession(session.current);
      send({ type: "start", sessionId: session.current.id, path: pathname, referrer: document.referrer || null });
      return;
    }
    if (!session.current) return;
    persist();
    send({ type: "page", sessionId: session.current.id, path: pathname });
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
