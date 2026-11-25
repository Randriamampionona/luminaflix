import { auth } from "@clerk/nextjs/server";
import { doodConfigured, getFileInfo } from "@/lib/community/doodstream";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/dood/[code] — DoodStream file status (processing done?
 * duration, thumbnail, embed URL). Signed-in users only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!doodConfigured()) return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
  const { code } = await params;
  try {
    const file = await getFileInfo(code);
    if (!file) return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
    return Response.json({ ok: true, file }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "FAILED" }, { status: 502 });
  }
}
