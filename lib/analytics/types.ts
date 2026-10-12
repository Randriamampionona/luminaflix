/**
 * Firestore schema — ANALYTICS/{sessionId} (one document per browsing session)
 * and ANALYTICS_VISITORS/{visitorKey} (lifetime visit counter per user / IP).
 * See ANALYTICS.md for the JSON schema.
 */
type VisitorType = "anonymous" | "authenticated";

export interface AnalyticsSession {
  sessionId: string;
  visitorType: VisitorType;
  /** Clerk user id when signed in, otherwise null. */
  userId: string | null;
  /** Masked IP: last IPv4 octet / IPv6 /48 suffix removed (e.g. "196.192.42.0"). Never the raw IP. */
  ipAddress: string;
  /** Salted SHA-256 of the IP (first 24 hex chars), used to count visits per IP. */
  ipHash: string;
  /** ISO 3166-1 alpha-2 country code ("MG", "FR"…) or "XX" when unknown. */
  country: string;
  city: string | null;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  referrer: string | null;
  /** Active time on the site, in seconds (time the tab was visible). */
  sessionDuration: number;
  /** Routes visited in this session, in first-visit order (max 50). */
  visitedPages: string[];
  pageViews: number;
  /** Total number of sessions for this user (signed in) or IP (anonymous), including this one. */
  visitFrequency: number;
  /** Date of the session start, "YYYY-MM-DD" (UTC). */
  day: string;
  startedAt: Date;
  lastActive: Date;
}

/** Client → /api/analytics/track */
export type TrackEvent =
  | { type: "start"; sessionId: string; path: string; referrer?: string | null }
  | { type: "page"; sessionId: string; path: string }
  | { type: "ping" | "end"; sessionId: string; activeSeconds: number };
