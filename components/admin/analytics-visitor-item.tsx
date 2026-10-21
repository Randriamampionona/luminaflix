"use client";

import { CheckCheck, Clock, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLiveSessionChat } from "@/hooks/use-live-session-chat";
import { CHAT_MAX_LENGTH, isChatConfigured } from "@/lib/live-chat";
import { cn } from "@/lib/utils";

/** One-tap messages for the admin. */
const QUICK_REPLIES = [
  "Thanks for supporting the app! 🍿",
  "Enjoying the stream? Share Lumina with friends and family! 🚀",
  "Need help finding a movie or K-Drama?",
];

/** "Message" button for a live visitor card (admin dashboard). */
export function MessageVisitorButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title="Message this visitor"
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
        open
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
          : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
      )}
    >
      <MessageCircle className="h-3 w-3" aria-hidden />
      Message
    </button>
  );
}

/**
 * Admin chat with one live visitor: quick replies + custom message, then the
 * live conversation (visitor replies appear instantly) and "End chat".
 */
export function VisitorChatPanel({ sessionId, visitorLabel }: { sessionId: string; visitorLabel: string }) {
  const { status, room, ended, send, end } = useLiveSessionChat(sessionId, "admin");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);
  const messages = room?.messages ?? [];
  const started = !!room?.startedAt;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!isChatConfigured()) {
    return (
      <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        Live chat isn&apos;t set up yet: add <code className="font-mono">NEXT_PUBLIC_FIREBASE_DATABASE_URL</code> (see
        LIVE_CHAT.md).
      </p>
    );
  }

  const dispatch = async (value: string) => {
    if (!value.trim() || sending) return;
    setSending(true);
    const ok = await send(value);
    setSending(false);
    if (ok) setText("");
    else toast.error("Couldn't send the message. Try again.");
  };

  const delivery = !started
    ? null
    : room?.visitorOnline
      ? { icon: CheckCheck, text: "Visitor connected — they see your messages", tone: "text-emerald-500" }
      : room?.leftAt
        ? {
            icon: Clock,
            text: `Visitor left ${Math.max(1, Math.round((now - room.leftAt) / 1000))}s ago`,
            tone: "text-amber-500",
          }
        : { icon: Loader2, text: "Delivering… (the chat opens on their screen)", tone: "text-fg-subtle" };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="truncate text-xs font-bold text-foreground">Chat with {visitorLabel}</p>
        {started && !ended && (
          <button
            type="button"
            onClick={() => void end()}
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider text-red-500 uppercase hover:bg-red-500/10"
          >
            <X className="h-3 w-3" aria-hidden />
            End chat
          </button>
        )}
      </div>

      {(messages.length > 0 || ended) && (
        <div ref={listRef} className="no-scrollbar max-h-60 space-y-2 overflow-y-auto px-3 py-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "admin" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap",
                  m.from === "admin"
                    ? "rounded-br-md bg-cyan-500 text-black"
                    : "rounded-bl-md border border-line bg-tint text-foreground",
                )}
              >
                {m.text}
              </p>
            </div>
          ))}
          {ended && (
            <p className="text-center text-[11px] text-fg-subtle">
              Chat ended — every message was deleted. Send a new message to start another one.
            </p>
          )}
        </div>
      )}

      {delivery && !ended && (
        <p className={cn("flex items-center gap-1.5 px-3 pb-2 text-[11px]", delivery.tone)}>
          <delivery.icon className={cn("h-3.5 w-3.5", delivery.icon === Loader2 && "animate-spin")} aria-hidden />
          {delivery.text}
        </p>
      )}

      {/* Composer: always available — after an ended chat, sending starts a new one. */}
      <div className="space-y-2 border-t border-line p-3">
        {(!started || ended) && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                disabled={sending || status !== "ready"}
                onClick={() => void dispatch(reply)}
                className="cursor-pointer rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1.5 text-left text-[11px] font-semibold text-fg-soft transition-colors hover:border-cyan-500/60 hover:text-foreground disabled:cursor-wait disabled:opacity-50"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void dispatch(text);
          }}
          className="flex gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={CHAT_MAX_LENGTH}
            placeholder={started && !ended ? "Reply…" : "Or write your own message…"}
            aria-label="Message"
            className="min-w-0 flex-1 rounded-xl border border-line-strong bg-background/70 px-3 py-2 text-xs text-foreground outline-none placeholder:text-fg-faint focus:border-cyan-500/60"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending || status !== "ready"}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-cyan-500 text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
