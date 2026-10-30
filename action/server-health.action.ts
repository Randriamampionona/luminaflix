"use server";

import { headers } from "next/headers";
import { clientIpFromHeaders } from "@/lib/analytics/ip";
import { recordServerReport } from "@/lib/server-health-server";

// One report per IP + title + server + type every 10 minutes (per server instance).
const recent = new Map<string, number>();

/** A server worked (≥ 3 min watched) or the visitor says it doesn't work. */
export async function reportServer(kind: string, mediaId: string, providerId: string, ok: boolean): Promise<void> {
  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(mediaId) || !/^[\w-]{2,40}$/.test(providerId)) {
    return;
  }
  const ip = clientIpFromHeaders(await headers()) ?? "unknown";
  const key = `${ip}|${kind}|${mediaId}|${providerId}|${ok}`;
  const last = recent.get(key) ?? 0;
  if (Date.now() - last < 10 * 60_000) return;
  recent.set(key, Date.now());
  if (recent.size > 20_000) recent.clear();
  await recordServerReport(kind, mediaId, providerId, ok);
}
