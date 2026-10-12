import "server-only";
import { isPrivateIp } from "./ip";

/**
 * IP → country (and city when available).
 *
 * 1. Hosting headers, free and instant: Vercel (`x-vercel-ip-country`,
 *    `x-vercel-ip-city`) or Cloudflare (`cf-ipcountry`).
 * 2. Fallback (local / ngrok): ipapi.co free lookup, 1.5 s timeout, cached in
 *    memory per server instance. Disable with ANALYTICS_GEO_LOOKUP=off.
 */
interface GeoInfo {
  country: string; // ISO alpha-2, "XX" if unknown
  city: string | null;
}

const UNKNOWN: GeoInfo = { country: "XX", city: null };
const cache = new Map<string, GeoInfo>();

export async function lookupGeo(headers: Headers, ip: string | null): Promise<GeoInfo> {
  const headerCountry = headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry");
  if (headerCountry && /^[A-Z]{2}$/i.test(headerCountry) && headerCountry.toUpperCase() !== "XX") {
    const city = headers.get("x-vercel-ip-city");
    return { country: headerCountry.toUpperCase(), city: city ? decodeURIComponent(city) : null };
  }

  if (process.env.ANALYTICS_GEO_LOOKUP === "off" || !ip || isPrivateIp(ip)) return UNKNOWN;
  const cached = cache.get(ip);
  if (cached) return cached;

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: AbortSignal.timeout(1500),
      headers: { "User-Agent": "luminaflix-analytics" },
      cache: "no-store",
    });
    const data = (await res.json()) as { country_code?: string; city?: string; error?: boolean };
    const info: GeoInfo =
      !data.error && data.country_code && /^[A-Z]{2}$/.test(data.country_code)
        ? { country: data.country_code, city: data.city || null }
        : UNKNOWN;
    if (cache.size > 5000) cache.clear();
    cache.set(ip, info);
    return info;
  } catch {
    return UNKNOWN;
  }
}
