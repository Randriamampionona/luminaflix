import { uploadStatus, verifyTicket } from "@/lib/community/chunked-upload";

export const dynamic = "force-dynamic";

/**
 * GET /api/community/upload/status   (header x-upload-ticket)
 * → { ok, status: receiving | transferring | done, received: [piece numbers], file, error }
 */
export async function GET(request: Request) {
  const ticket = verifyTicket(request.headers.get("x-upload-ticket"));
  if (!ticket) return Response.json({ ok: false, error: "TICKET" }, { status: 401 });
  const status = await uploadStatus(ticket.id);
  if (!status) return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  return Response.json({ ok: true, ...status }, { headers: { "Cache-Control": "no-store" } });
}
