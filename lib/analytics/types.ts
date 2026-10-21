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
  /** Route the visitor is on right now (last page view). */
  currentPage: string;
  /** Routes visited in this session, in first-visit order (max 50). */
  visitedPages: string[];
  pageViews: number;
  /** Total number of sessions for this user (signed in) or IP (anonymous), including this one. */
  visitFrequency: number;
  /** VPN / proxy reputation of the IP (null: not checked / unknown). */
  vpn?: { detected: boolean; type: string | null; provider: string | null } | null;
  /** Device time zone (e.g. "Indian/Antananarivo") and its country — a VPN hint when it differs from `country`. */
  timeZone?: string | null;
  timeZoneCountry?: string | null;
  /** True while the tab is open and visible; false once it is hidden or closed. */
  online: boolean;
  /** When the visitor last left (tab hidden / closed), null while online. */
  leftAt: Date | null;
  /** Date of the session start, "YYYY-MM-DD" (UTC). */
  day: string;
  startedAt: Date;
  lastActive: Date;
}

/** Client → /api/analytics/track */
export type TrackEvent =
  | { type: "start"; sessionId: string; path: string; referrer?: string | null; timeZone?: string }
  /** `newPage`: first visit of this path in the session (the browser keeps the list, max 50). */
  | { type: "page"; sessionId: string; path: string; newPage?: boolean }
  | { type: "ping" | "end"; sessionId: string; activeSeconds: number };
