import { verifyTicket, writeChunk } from "@/lib/community/chunked-upload";

export const dynamic = "force-dynamic";

/**
 * PUT /api/community/upload/chunk?index=N   (header x-upload-ticket, body = the piece's bytes)
 * Sending the same piece again replaces it (automatic retries are safe).
 */
export async function PUT(request: Request) {
  const ticket = verifyTicket(request.headers.get("x-upload-ticket"));
  if (!ticket) return Response.json({ ok: false, error: "TICKET" }, { status: 401 });
  const index = Number(new URL(request.url).searchParams.get("index"));
  if (!request.body) return Response.json({ ok: false, error: "INVALID" }, { status: 400 });
  try {
    const result = await writeChunk(ticket.id, index, request.body);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: result.status });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[community] chunk write failed", error);
    return Response.json({ ok: false, error: "FAILED" }, { status: 500 });
  }
}
