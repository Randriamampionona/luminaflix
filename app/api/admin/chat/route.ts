import { checkAnalyticsAdmin } from "@/lib/analytics/admin";
import { endChat, sendAdminMessage, validChat } from "@/lib/live-chat-server";

/**
 * Admin side of the live chat (admin only, same check as /analytics).
 * POST   { sessionId, text } → sends a message to that visitor (starts the chat)
 * DELETE ?sessionId=…        → ends the chat and deletes every message
 */
async function forbidden() {
  const access = await checkAnalyticsAdmin();
  return access.status === "admin"
    ? null
    : Response.json({ error: "Forbidden" }, { status: access.status === "signed-out" ? 401 : 403 });
}

export async function POST(request: Request) {
  const denied = await forbidden();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown; text?: unknown } | null;
  if (!body || !validChat(body.sessionId, body.text)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await sendAdminMessage(body.sessionId as string, body.text as string);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[live-chat] send failed", error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const denied = await forbidden();
  if (denied) return denied;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!validChat(sessionId)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await endChat(sessionId!);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[live-chat] end failed", error);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
