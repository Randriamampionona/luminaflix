import { handleMediaReaction } from "@/action/stream-actions";
import type { MediaRef } from "@/lib/media-interactions";

/**
 * POST /api/media/reaction  { mediaId, type, season?, episode?, action: "like" | "dislike" } → ReactionResult
 *
 * Same as the handleMediaReaction server action, called with fetch so that a
 * like / dislike doesn't re-render the page (and restart the stream).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as (MediaRef & { action: "like" | "dislike" }) | null;
  if (!body || typeof body !== "object" || (body.action !== "like" && body.action !== "dislike")) {
    return Response.json({ success: false, error: "INVALID" }, { status: 400 });
  }
  try {
    return Response.json(await handleMediaReaction(body), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ success: false, error: "FAILED" }, { status: 500 });
  }
}
