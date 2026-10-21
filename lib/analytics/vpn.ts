import "server-only";
import { unstable_cache } from "next/cache";
import { isPrivateIp } from "./ip";
import { TIME_ZONE_COUNTRY } from "./time-zones";

/**
 * VPN / proxy detection for the analytics (see ANALYTICS.md).
 *
 * 1. IP reputation — proxycheck.io knows the addresses of VPN companies,
 *    proxies and data centers. One check per IP per day (cached), 2 s timeout.
 *    Free: 100 checks/day without a key, 1,000/day with PROXYCHECK_API_KEY.
 *    VPN_CHECK=off disables it (the time-zone hint below still works).
 * 2. Time-zone hint — the device's time zone vs the IP's country: an IP in
 *    Kenya with a device set to Indian/Antananarivo is very likely a VPN.
 *
 * The real address behind a VPN is never known (nor looked for).
 */
interface VpnInfo {
  /** proxycheck.io says the IP is a VPN / proxy / data-center address. */
  detected: boolean;
  /** "VPN", "Hosting", "SOCKS5"… as reported. */
  type: string | null;
  /** e.g. "NordVPN", "M247 Ltd". */
  provider: string | null;
}

interface ProxycheckResult {
  status?: string;
  [ip: string]: unknown;
}

async function fetchVpn(ip: string): Promise<VpnInfo | null> {
  const params = new URLSearchParams({ vpn: "1", asn: "1" });
  if (process.env.PROXYCHECK_API_KEY) params.set("key", process.env.PROXYCHECK_API_KEY);
  const res = await fetch(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?${params}`, {
    signal: AbortSignal.timeout(2000),
    cache: "no-store",
  });
  const body = (await res.json()) as ProxycheckResult;
  const entry = body[ip] as { proxy?: string; type?: string; provider?: string; organisation?: string } | undefined;
  // "denied" / "error" (quota reached…): unknown, not cached as "no VPN".
  if (!entry || (body.status !== "ok" && body.status !== "warning")) throw new Error(`proxycheck: ${body.status}`);
  return {
    detected: entry.proxy === "yes",
    type: entry.type ?? null,
    provider: entry.provider || entry.organisation || null,
  };
}

/** VPN reputation of an IP (cached 24 h per IP hash), or null when unknown. */
export async function lookupVpn(ip: string | null, ipHash: string): Promise<VpnInfo | null> {
  if (process.env.VPN_CHECK === "off" || !ip || isPrivateIp(ip)) return null;
  try {
    return await unstable_cache(() => fetchVpn(ip), ["vpn-v1", ipHash], { revalidate: 24 * 3600 })();
  } catch {
    return null;
  }
}

const TZ_RE = /^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/;

/** Validated device time zone and its country ("XX" unknown). */
export function deviceTimeZone(value: unknown): { timeZone: string | null; timeZoneCountry: string | null } {
  if (typeof value !== "string" || value.length > 64 || !TZ_RE.test(value))
    return { timeZone: null, timeZoneCountry: null };
  return { timeZone: value, timeZoneCountry: TIME_ZONE_COUNTRY[value] ?? null };
}
