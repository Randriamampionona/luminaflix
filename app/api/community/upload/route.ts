import { auth } from "@clerk/nextjs/server";
import { apiKeyPart, doodConfigured, getUploadServer, toDoodFile } from "@/lib/community/doodstream";
import { createRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Max video size (MB), COMMUNITY_MAX_UPLOAD_MB to change it. */
const MAX_BYTES = (Number(process.env.COMMUNITY_MAX_UPLOAD_MB) || 4096) * 1024 * 1024;
/** 20 uploads per user per day. */
const isLimited = createRateLimiter({ max: 20, windowMs: 24 * 60 * 60 * 1000 });

/**
 * POST /api/community/upload — multipart/form-data with one field "file".
 *
 * Streams the video straight through to DoodStream's upload server (nothing
 * is stored here): the DoodStream API key is added on the server, so it is
 * never exposed to the browser. Answers { ok, file: { fileCode, embedUrl,
 * thumbnail, title, durationSec, canPlay } }.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  if (!doodConfigured()) return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
  if (isLimited(userId)) return Response.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

  const contentType = request.headers.get("content-type") ?? "";
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  if (!contentType.startsWith("multipart/form-data") || !boundary || !request.body) {
    return Response.json({ ok: false, error: "INVALID" }, { status: 400 });
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BYTES) return Response.json({ ok: false, error: "TOO_LARGE" }, { status: 413 });

  try {
    const uploadUrl = await getUploadServer();
    const prefix = new TextEncoder().encode(apiKeyPart(boundary[1] || boundary[2]));
    const reader = request.body.getReader();
    let sentPrefix = false;
    // The visitor's multipart body, with the api_key field added in front — streamed, never buffered.
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (!sentPrefix) {
          sentPrefix = true;
          controller.enqueue(prefix);
          return;
        }
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel(reason) {
        void reader.cancel(reason);
      },
    });

    const headers: Record<string, string> = { "content-type": contentType };
    if (length) headers["content-length"] = String(length + prefix.byteLength);
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers,
      body,
      // Required by Node's fetch to send a stream.
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const data = (await res.json().catch(() => null)) as { msg?: string; result?: unknown[] } | null;
    const raw = Array.isArray(data?.result) ? data.result[0] : null;
    const file = raw ? toDoodFile(raw as Parameters<typeof toDoodFile>[0]) : null;
    if (!file) {
      console.error("[community] DoodStream upload failed", res.status, data?.msg);
      return Response.json({ ok: false, error: "UPLOAD_FAILED" }, { status: 502 });
    }
    return Response.json({ ok: true, file }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[community] upload error", error);
    return Response.json({ ok: false, error: "UPLOAD_FAILED" }, { status: 502 });
  }
}
