import { auth } from "@clerk/nextjs/server";
import { isAdminUserId } from "@/lib/analytics/admin";

/** GET /api/admin/me → { admin: boolean } for the signed-in session (shows the admin links in the menu). */
export async function GET() {
  const { userId } = await auth();
  return Response.json({ admin: isAdminUserId(userId) }, { headers: { "Cache-Control": "private, no-store" } });
}
