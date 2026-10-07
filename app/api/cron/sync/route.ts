import { NextResponse } from "next/server";
import { triggerDailySync } from "@/action/daily-sync.action";
import { isAuthorizedCron } from "@/lib/cron-auth";

/** Daily picks email — called by cron-job.org (see lib/cron-auth.ts). */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    return NextResponse.json(await triggerDailySync());
  } catch (error) {
    console.error("[cron/sync] failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
