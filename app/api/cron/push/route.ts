import { NextResponse } from "next/server";
import { triggerDailyPush } from "@/action/daily-push.action";
import { isAuthorizedCron } from "@/lib/cron-auth";

/**
 * Daily push notification — its own cron-job.org job, separate from the
 * email (/api/cron/sync).
 *
 * POST /api/cron/push            → every subscribed user (production)
 * POST /api/cron/push?test=1     → only PUSH_TEST_USER_IDS
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isAuthorizedCron(req.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const test = new URL(req.url).searchParams.get("test") === "1";
  try {
    const result = await triggerDailyPush({ test });
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("[cron/push] failed", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
