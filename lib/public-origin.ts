/**
 * The site's public origin (https://www.lumina-flix.live) for absolute URLs
 * built on the server — redirects in particular.
 *
 * Never take it from `request.url`: on a self-hosted Node server (Namecheap /
 * cPanel, Passenger) Next.js sees the address it listens on, e.g.
 * `http://0.0.0.0:3000`, so redirects sent visitors (and link-preview robots)
 * to https://0.0.0.0:3000/… . Order: NEXT_PUBLIC_DOMAIN, then the proxy's
 * forwarded host / Host header, then localhost.
 */
const SITE = (process.env.NEXT_PUBLIC_DOMAIN || "").replace(/\/+$/, "");

export function publicOrigin(headers?: Headers): string {
  if (SITE) {
    try {
      return new URL(SITE).origin;
    } catch {
      // fall through
    }
  }
  const host = headers?.get("x-forwarded-host")?.split(",")[0].trim() || headers?.get("host")?.trim();
  if (host && !/^(0\.0\.0\.0|127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
    const proto = headers?.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

/** Absolute URL of a path on the public site. */
export const publicUrl = (path: string, headers?: Headers) => new URL(path, publicOrigin(headers));
