import { auth } from "@clerk/nextjs/server";
import { startUpload } from "@/lib/community/chunked-upload";
import { doodConfigured } from "@/lib/community/doodstream";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Max video size (MB), COMMUNITY_MAX_UPLOAD_MB to change it. */
const MAX_BYTES = (Number(process.env.COMMUNITY_MAX_UPLOAD_MB) || 4096) * 1024 * 1024;
/** 20 uploads per user per day. */
const isLimited = createRateLimiter({ max: 20, windowMs: 24 * 60 * 60 * 1000 });

/**
 * POST /api/community/upload/start  { name, type, size }
 * → { ok, id, ticket, chunkSize, totalChunks }
 * Signed-in members only. The ticket (valid 12 h) authorises the pieces, so a
 * long upload never depends on the 60-second Clerk session token.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!doodConfigured()) return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { name?: string; type?: string; size?: number } | null;
  const size = Number(body?.size);
  if (!body || typeof body.name !== "string" || !Number.isFinite(size) || size <= 0) {
    return Response.json({ ok: false, error: "INVALID" }, { status: 400 });
  }
  if (size > MAX_BYTES) return Response.json({ ok: false, error: "TOO_LARGE" }, { status: 413 });
  if (isLimited(userId)) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });
  try {
    const session = await startUpload({ userId, name: body.name, type: String(body.type ?? ""), size });
    return Response.json({ ok: true, ...session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[community] start upload failed", error);
    return Response.json({ ok: false, error: "FAILED" }, { status: 500 });
  }
}
