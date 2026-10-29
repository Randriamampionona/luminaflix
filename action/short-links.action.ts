"use server";

import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { ADMIN_NO_TRACK_COOKIE, isAdminUserId } from "@/lib/analytics/admin";
import { clientIpFromHeaders } from "@/lib/analytics/ip";
import { logFirebaseError } from "@/lib/firebase-admin";
import { getShortCode, recordShortLinkShare } from "@/lib/short-links-server";
import { SHORT_CODE_RE } from "@/lib/short-links";
import type { ShortLinkCodes, ShortLinkKind } from "@/lib/short-links";

interface ShortenInput {
  title: string;
  /** "movie" | "anime" | "drama" | "tv" */
  mediaKind: string;
  /** Site paths ("/movies/123", "/trailer/123?type=movie&lang=fr") or the TMDB poster URL. */
  links: Partial<Record<ShortLinkKind, string | null>>;
}

/** Only our own pages and TMDB posters can be shortened (no open redirect). */
function isAllowedTarget(kind: ShortLinkKind, target: string) {
  if (target.length > 600) return false;
  if (kind === "poster") return /^https:\/\/image\.tmdb\.org\/t\/p\/[\w/.-]+$/.test(target);
  return /^\/(?!\/)[\w\-/.~%?=&]*$/.test(target);
}

const mediaIdOf = (path: string | null | undefined) => (path ? (/\/(\d+)(?:[/?#]|$)/.exec(path)?.[1] ?? null) : null);

// Light abuse protection: 60 shorten calls per IP per minute (per server instance).
const calls = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (calls.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  calls.set(ip, recent);
  if (calls.size > 5000) calls.clear();
  return recent.length > 60;
}

/**
 * Short codes for the links of a shared title (page, trailer, poster, series).
 * Returns only the codes it could create; the share card keeps the full URL
 * for the others.
 */
export async function shortenShareLinks(input: ShortenInput): Promise<ShortLinkCodes> {
  const ip = clientIpFromHeaders(await headers()) ?? "unknown";
  if (limited(ip)) return {};
  const title = String(input.title ?? "").slice(0, 200);
  const mediaKind = String(input.mediaKind ?? "").slice(0, 20);
  const mediaId = mediaIdOf(input.links.page);
  const result: ShortLinkCodes = {};
  await Promise.all(
    (Object.entries(input.links) as [ShortLinkKind, string | null | undefined][]).map(async ([kind, target]) => {
      if (!target || !isAllowedTarget(kind, target)) return;
      try {
        result[kind] = await getShortCode(target, { kind, title, mediaKind, mediaId });
      } catch (error) {
        logFirebaseError("short-links:create", error);
      }
    }),
  );
  return result;
}

const CHANNELS = ["copy", "native", "whatsapp", "telegram"] as const;

/**
 * The visitor really shared the title (copy button, share sheet, WhatsApp,
 * Telegram): counted on its page link. The admin's own shares are ignored.
 */
export async function markShortLinkShared(code: string, channel: string): Promise<void> {
  if (!SHORT_CODE_RE.test(code) || !(CHANNELS as readonly string[]).includes(channel)) return;
  const [h, jar] = await Promise.all([headers(), cookies()]);
  if (limited(clientIpFromHeaders(h) ?? "unknown")) return;
  const userId = await auth()
    .then((session) => session.userId)
    .catch(() => null);
  if (jar.has(ADMIN_NO_TRACK_COOKIE) || isAdminUserId(userId)) return;
  await recordShortLinkShare(code, channel);
}
