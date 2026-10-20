/** Where the analytics tracker keeps the current session (one per tab). */
export const ANALYTICS_SESSION_KEY = "lf_analytics_session";

/** Current analytics session id of this tab, or null (not tracked / storage blocked). */
export function readAnalyticsSessionId(): string | null {
  try {
    const raw = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    const id = raw ? (JSON.parse(raw) as { id?: unknown }).id : null;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
