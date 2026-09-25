/**
 * Return-to-origin helpers for the sign-in flow.
 *
 * BUG FIX (auth redirect state loss): the download button used to send users
 * to `/sign-in?fallback_redirect_url=<pathname>`. That dropped the query
 * string (season / episode), wasn't Clerk's native parameter (so it was lost
 * when switching to sign-up or going through OAuth) and sign-up ignored it.
 *
 * We now (1) pass the full path + query as Clerk's `redirect_url` /
 * `forceRedirectUrl`, and (2) keep a short-lived copy in sessionStorage that
 * <PostAuthRedirect /> uses as a safety net if Clerk still lands on `/`.
 */
const RETURN_TO_STORAGE_KEY = "luminaflix:return-to";
const RETURN_TO_TTL_MS = 15 * 60 * 1000;
const AUTH_ROUTE = /^\/(sign-in|sign-up)(\/|\?|#|$)/;

/**
 * Only allows same-origin relative paths (prevents open redirects).
 * Absolute URLs are accepted when their origin matches `origin`.
 */
export function sanitizeReturnTo(
  value: string | null | undefined,
  origin?: string,
): string | null {
  if (!value) return null;
  let candidate = value.trim();

  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      if (!origin || url.origin !== origin) return null;
      candidate = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return null;
  }
  if (AUTH_ROUTE.test(candidate)) return null;
  return candidate;
}

export function getCurrentLocation(): string {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

export function buildSignInHref(returnTo: string, route: "/sign-in" | "/sign-up" = "/sign-in") {
  const safe = sanitizeReturnTo(returnTo);
  return safe ? `${route}?redirect_url=${encodeURIComponent(safe)}` : route;
}

export function rememberReturnTo(path: string) {
  const safe = sanitizeReturnTo(path);
  if (!safe) return;
  try {
    sessionStorage.setItem(
      RETURN_TO_STORAGE_KEY,
      JSON.stringify({ path: safe, at: Date.now() }),
    );
  } catch {
    // Storage unavailable (private mode, quota) — Clerk's redirect still works.
  }
}

/** Reads and clears the stored path. Returns null when missing or expired. */
export function consumeReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !at || Date.now() - at > RETURN_TO_TTL_MS) return null;
    return sanitizeReturnTo(path);
  } catch {
    return null;
  }
}
