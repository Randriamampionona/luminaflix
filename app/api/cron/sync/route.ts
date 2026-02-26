import { triggerDailySync } from "@/action/daily-sync.action";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Security: Check for Vercel Cron Secret Header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await triggerDailySync();
  return NextResponse.json(result);
}
