import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { getLiveSessions } from "@/lib/analytics/queries";
import { cleanupChats } from "@/lib/live-chat-server";

/** GET /api/analytics/live — who is on the site right now. Admin only. */
export async function GET() {
  const access = await checkAnalyticsAdmin();
  if (access.status !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: access.status === "signed-out" ? 401 : 403 });
  }
  // Housekeeping while the admin watches: delete chats of visitors who left (≤ once per 5 min).
  if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL) void cleanupChats();
  return Response.json(await getLiveSessions(), { headers: { "Cache-Control": "no-store" } });
}
