import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { getLiveSessions } from "@/lib/analytics/queries";

/** GET /api/analytics/live — who is on the site right now. Admin only. */
export async function GET() {
  const access = await checkAnalyticsAdmin();
  if (access.status !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: access.status === "signed-out" ? 401 : 403 });
  }
  return Response.json(await getLiveSessions(), { headers: { "Cache-Control": "no-store" } });
}
