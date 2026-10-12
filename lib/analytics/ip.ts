import "server-only";
import { createHmac } from "node:crypto";

/** Visitor IP from the proxy headers (Vercel / Cloudflare / ngrok). */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || headers.get("cf-connecting-ip") || null;
}

/** 196.192.42.17 → 196.192.42.0 ; 2001:db8:85a3::8a2e → 2001:db8:85a3::  (GDPR-friendly). */
export function maskIp(ip: string | null): string {
  if (!ip) return "unknown";
  const v4 = ip.replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, ".0");
  const groups = ip.split(":").filter(Boolean).slice(0, 3);
  return groups.length ? `${groups.join(":")}::` : "unknown";
}

/**
 * Stable, non-reversible id for an IP. Uses ANALYTICS_SALT (any long random
 * string) so the hash can't be brute-forced back to the IP.
 */
export function hashIp(ip: string | null): string {
  const salt = process.env.ANALYTICS_SALT || process.env.CLERK_SECRET_KEY || "luminaflix-analytics";
  return createHmac("sha256", salt)
    .update(ip ?? "unknown")
    .digest("hex")
    .slice(0, 24);
}

export function isPrivateIp(ip: string | null) {
  if (!ip) return true;
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip.replace(/^::ffff:/, ""));
}
