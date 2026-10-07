import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Shared check for the cron endpoints (/api/cron/sync, /api/cron/push),
 * called by cron-job.org with `Authorization: Bearer <CRON_SECRET>`.
 * Constant-time, fails closed when CRON_SECRET is unset. Accepts both
 * "Bearer <secret>" and a raw "<secret>".
 */
export function isAuthorizedCron(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
