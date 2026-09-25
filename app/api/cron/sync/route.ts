import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { triggerDailySync } from "@/action/daily-sync.action";

/**
 * SECURITY FIX: the previous check compared `Bearer ${header}` with
 * `Bearer ${CRON_SECRET}`, which (a) passed when CRON_SECRET was unset and
 * the header was the literal string "undefined", and (b) was not
 * constant-time. Accepts both "Bearer <secret>" and a raw "<secret>".
 */
function isAuthorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const provided = header.startsWith("Bearer ") ? header.slice(7) : header;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    return NextResponse.json(await triggerDailySync());
  } catch (error) {
    console.error("[cron/sync] failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
