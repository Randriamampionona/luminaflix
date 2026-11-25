import { completeUpload, verifyTicket } from "@/lib/community/chunked-upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/community/upload/complete   (header x-upload-ticket)
 * All pieces in: the server reassembles them and sends the video to DoodStream
 * by itself, in the background. Follow with GET …/status.
 */
export async function POST(request: Request) {
  const ticket = verifyTicket(request.headers.get("x-upload-ticket"));
  if (!ticket) return Response.json({ ok: false, error: "TICKET" }, { status: 401 });
  const result = await completeUpload(ticket.id);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: result.status });
  return Response.json({ ok: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
