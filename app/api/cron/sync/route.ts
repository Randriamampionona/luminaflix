import { triggerDailySync } from "@/action/daily-sync.action";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Security check: Match the header you will set in cron-job.org
  const authHeader = req.headers.get("Authorization");
  if (`Bearer ${authHeader}` !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await triggerDailySync();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
