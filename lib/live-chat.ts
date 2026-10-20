/**
 * Live chat between the admin and a visitor (see LIVE_CHAT.md).
 *
 * Firebase Realtime Database, one ephemeral room per analytics session:
 *   live_chats/{sessionId}
 *     startedAt, updatedAt, adminName      ← written by the server (admin)
 *     visitorOnline, leftAt                ← written by the visitor's browser
 *     messages/{pushId}: { from: "admin" | "visitor", text, at }
 *
 * The room only exists once the admin has written; it is deleted when the
 * visitor closes the chat, when the admin ends it, and by the cleanup when the
 * visitor has left the site (lib/live-chat-server.ts). No Firestore involved.
 */
export const CHAT_ROOT = "live_chats";
export const CHAT_MAX_LENGTH = 500;
/** Analytics session ids are crypto.randomUUID() values. */
export const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ChatMessage {
  id: string;
  from: "admin" | "visitor";
  text: string;
  at: number;
}

export interface ChatRoom {
  startedAt: number | null;
  adminName: string;
  visitorOnline: boolean;
  leftAt: number | null;
  messages: ChatMessage[];
}

/** Realtime Database snapshot value → typed room (null when the room doesn't exist). */
export function parseRoom(value: unknown): ChatRoom | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const messages = Object.entries((raw.messages as Record<string, Record<string, unknown>>) ?? {})
    .map(([id, m]) => ({
      id,
      from: m?.from === "visitor" ? ("visitor" as const) : ("admin" as const),
      text: typeof m?.text === "string" ? m.text : "",
      at: typeof m?.at === "number" ? m.at : 0,
    }))
    .filter((m) => m.text)
    .sort((a, b) => a.at - b.at);
  return {
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : null,
    adminName: typeof raw.adminName === "string" && raw.adminName ? raw.adminName : "Admin",
    visitorOnline: raw.visitorOnline === true,
    leftAt: typeof raw.leftAt === "number" ? raw.leftAt : null,
    messages,
  };
}

export const isChatConfigured = () => !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
