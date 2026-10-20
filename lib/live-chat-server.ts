import "server-only";
import admin from "firebase-admin";
import { getRealtimeDb } from "@/lib/firebase-admin";
import { CHAT_MAX_LENGTH, CHAT_ROOT, SESSION_ID_RE } from "@/lib/live-chat";

/** Shown to visitors as the sender of admin messages. */
const ADMIN_NAME = process.env.CHAT_ADMIN_NAME?.trim() || "LuminaFlix";
/** A visitor who left more than this long ago won't come back to the chat. */
const LEFT_GRACE_MS = 2 * 60 * 1000;
/** Any room idle for this long is removed. */
const MAX_IDLE_MS = 6 * 60 * 60 * 1000;
/** Cleanup runs at most this often per server instance. */
const CLEANUP_EVERY_MS = 5 * 60 * 1000;

let lastCleanup = 0;

/** Deletes rooms of visitors who left (and forgotten rooms). Never throws. */
export async function cleanupChats(force = false) {
  if (!force && Date.now() - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = Date.now();
  try {
    const root = getRealtimeDb().ref(CHAT_ROOT);
    const [left, idle] = await Promise.all([
      root.orderByChild("leftAt").startAt(1).endAt(Date.now() - LEFT_GRACE_MS).get(),
      root.orderByChild("updatedAt").startAt(1).endAt(Date.now() - MAX_IDLE_MS).get(),
    ]);
    const updates: Record<string, null> = {};
    left.forEach((room) => {
      // Still "left" (not back online)?
      if (room.child("visitorOnline").val() !== true) updates[room.key!] = null;
    });
    idle.forEach((room) => {
      updates[room.key!] = null;
    });
    if (Object.keys(updates).length) await root.update(updates);
  } catch (error) {
    console.error("[live-chat] cleanup failed", error);
  }
}

export function validChat(sessionId: unknown, text?: unknown) {
  if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) return false;
  if (text === undefined) return true;
  return typeof text === "string" && text.trim().length > 0 && text.length <= CHAT_MAX_LENGTH;
}

/** Admin → visitor message. Creates the room on the first one. */
export async function sendAdminMessage(sessionId: string, text: string) {
  const room = getRealtimeDb().ref(`${CHAT_ROOT}/${sessionId}`);
  const now = admin.database.ServerValue.TIMESTAMP;
  const started = (await room.child("startedAt").get()).exists();
  await room.update({
    ...(!started && { startedAt: now, adminName: ADMIN_NAME }),
    updatedAt: now,
  });
  await room.child("messages").push({ from: "admin", text: text.trim(), at: now });
  void cleanupChats();
}

/** Ends the chat for both sides: the room (and every message) is deleted. */
export async function endChat(sessionId: string) {
  await getRealtimeDb().ref(`${CHAT_ROOT}/${sessionId}`).remove();
  void cleanupChats();
}
