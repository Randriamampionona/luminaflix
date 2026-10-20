"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadRealtimeDb } from "@/lib/firebase-client";
import { CHAT_MAX_LENGTH, CHAT_ROOT, type ChatRoom, isChatConfigured, parseRoom } from "@/lib/live-chat";

type ChatRole = "visitor" | "admin";
type Rtdb = Awaited<ReturnType<typeof loadRealtimeDb>>;

interface State {
  sessionId: string;
  room: ChatRoom | null;
  /** The room existed and is gone: the chat was ended (by either side). */
  ended: boolean;
}

/**
 * Live chat room of one analytics session (Firebase Realtime Database).
 *
 * - visitor: listens to its own room; once the admin has written, marks itself
 *   online and registers "on disconnect → offline" (tab closed, network lost),
 *   so the server cleanup can delete the room when the visitor really left.
 *   Replies are written straight to the database (allowed by the rules).
 * - admin: listens to the visitor's room; messages go through /api/admin/chat.
 */
export function useLiveSessionChat(sessionId: string | null, role: ChatRole) {
  const [state, setState] = useState<State | null>(null);
  const [connected, setConnected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rtdbRef = useRef<Rtdb | null>(null);
  const presenceFor = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || !isChatConfigured()) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void loadRealtimeDb()
      .then((rtdb) => {
        if (cancelled) return;
        rtdbRef.current = rtdb;
        const { db, rtdb: fn } = rtdb;
        const roomRef = fn.ref(db, `${CHAT_ROOT}/${sessionId}`);
        unsubscribe = fn.onValue(
          roomRef,
          (snapshot) => {
            const room = parseRoom(snapshot.val());
            setConnected(sessionId);
            setState((prev) => ({
              sessionId,
              room,
              ended: !room && !!(prev?.sessionId === sessionId && prev.room?.startedAt),
            }));
            // Chat ended (room deleted): drop the pending "offline" write so it
            // doesn't recreate an empty room when the tab closes.
            if (role === "visitor" && !room && presenceFor.current === sessionId) {
              presenceFor.current = null;
              void fn.onDisconnect(roomRef).cancel().catch(() => {});
            }
            // Visitor presence, only once a chat exists (no writes for everyone else).
            if (role === "visitor" && room?.startedAt && presenceFor.current !== sessionId) {
              presenceFor.current = sessionId;
              void fn
                .onDisconnect(roomRef)
                .update({ visitorOnline: false, leftAt: fn.serverTimestamp() })
                .then(() => fn.update(roomRef, { visitorOnline: true, leftAt: null }))
                .catch(() => {
                  presenceFor.current = null;
                });
            }
          },
          (err) => setError(err.message),
        );
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [sessionId, role]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim().slice(0, CHAT_MAX_LENGTH);
      if (!sessionId || !clean) return false;
      try {
        if (role === "admin") {
          const res = await fetch("/api/admin/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, text: clean }),
          });
          return res.ok;
        }
        const rtdb = rtdbRef.current;
        if (!rtdb) return false;
        const { db, rtdb: fn } = rtdb;
        await fn.push(fn.ref(db, `${CHAT_ROOT}/${sessionId}/messages`), {
          from: "visitor",
          text: clean,
          at: fn.serverTimestamp(),
        });
        return true;
      } catch {
        return false;
      }
    },
    [sessionId, role],
  );

  /** Ends the chat for both sides (the room and its messages are deleted). */
  const end = useCallback(async () => {
    if (!sessionId) return;
    try {
      if (role === "admin") {
        await fetch(`/api/admin/chat?sessionId=${encodeURIComponent(sessionId)}`, { method: "DELETE" });
        return;
      }
      const rtdb = rtdbRef.current;
      if (!rtdb) return;
      const roomRef = rtdb.rtdb.ref(rtdb.db, `${CHAT_ROOT}/${sessionId}`);
      await rtdb.rtdb.onDisconnect(roomRef).cancel();
      await rtdb.rtdb.remove(roomRef);
    } catch {
      // already gone
    }
  }, [sessionId, role]);

  const current = state?.sessionId === sessionId ? state : null;
  return {
    /** "off": no session or chat not configured; "connecting"; "ready". */
    status: !sessionId || !isChatConfigured() ? "off" : connected === sessionId ? "ready" : "connecting",
    room: current?.room ?? null,
    ended: current?.ended ?? false,
    error,
    send,
    end,
  } as const;
}
