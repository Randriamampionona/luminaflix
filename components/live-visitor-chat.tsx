"use client";

import { MessageCircle, Minus, Send, ShieldCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLiveSessionChat } from "@/hooks/use-live-session-chat";
import { readAnalyticsSessionId } from "@/lib/analytics/client-session";
import { CHAT_MAX_LENGTH, isChatConfigured } from "@/lib/live-chat";
import { cn } from "@/lib/utils";

/** The analytics session can be renewed (30 min idle): re-read it now and then. */
const subscribeSession = (onChange: () => void) => {
  const timer = setInterval(onChange, 15_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
};
/** Wait a little after the page loads before opening the realtime connection. */
const CONNECT_DELAY_MS = 3_000;

/**
 * Visitor side of the live chat: invisible until the admin writes, then a
 * chat panel in the bottom-right corner (minimisable to a bubble with an
 * unread badge). The visitor can reply; ✕ ends the chat and deletes it.
 */
export default function LiveVisitorChat() {
  const t = useTranslations("liveChat");
  const locale = useLocale();
  const pathname = usePathname();
  const sessionId = useSyncExternalStore(subscribeSession, readAnalyticsSessionId, () => null);
  const [enabled, setEnabled] = useState(false);
  const { room, ended, send, end } = useLiveSessionChat(enabled ? sessionId : null, "visitor");
  const [minimized, setMinimized] = useState(false);
  const [seenAt, setSeenAt] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChatConfigured()) return;
    const timer = setTimeout(() => setEnabled(true), CONNECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const messages = room?.messages ?? [];
  const lastAdminAt = messages.filter((m) => m.from === "admin").at(-1)?.at ?? 0;
  const unread = minimized ? messages.filter((m) => m.from === "admin" && m.at > seenAt).length : 0;
  const visible = !dismissed && pathname !== "/launch" && (lastAdminAt > 0 || ended);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, minimized]);

  if (!visible) return null;

  const time = (ms: number) =>
    ms ? new Date(ms).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const ok = await send(text);
    setSending(false);
    if (ok) setText("");
  };

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={t("open")}
        className="fixed right-5 bottom-5 z-105 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-cyan-500 text-black shadow-[0_12px_40px_-8px_rgba(6,182,212,0.9)] transition-transform hover:scale-105 animate-in zoom-in duration-300"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-background">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={t("title")}
      className="dark fixed right-3 bottom-3 z-105 flex max-h-[min(70vh,34rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 text-white shadow-[0_24px_80px_-20px_rgba(6,182,212,0.6)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 sm:right-5 sm:bottom-5"
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-blue-600 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          {!ended && (
            <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-black">
            {room?.adminName ?? "Admin"}
            <span className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-cyan-300 uppercase">
              {t("badge")}
            </span>
          </p>
          <p className="truncate text-[11px] text-zinc-400">{ended ? t("endedShort") : t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSeenAt(Date.now());
            setMinimized(true);
          }}
          aria-label={t("minimize")}
          className="cursor-pointer rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            if (!ended) void end();
          }}
          aria-label={t("close")}
          className="cursor-pointer rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Messages */}
      <div ref={listRef} className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex flex-col", m.from === "visitor" ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
                m.from === "visitor"
                  ? "rounded-br-md bg-cyan-500 text-black"
                  : "rounded-bl-md border border-white/10 bg-white/[0.06] text-zinc-100",
              )}
            >
              {m.text}
            </div>
            <span className="mt-1 px-1 text-[10px] text-zinc-500">
              {m.from === "visitor" ? t("you") : (room?.adminName ?? "Admin")} · {time(m.at)}
            </span>
          </div>
        ))}
        {ended && (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center text-xs text-zinc-400">
            {t("ended")}
          </p>
        )}
      </div>

      {/* Reply */}
      {!ended && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex items-end gap-2 border-t border-white/10 p-3"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            maxLength={CHAT_MAX_LENGTH}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-500/60"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label={t("send")}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-cyan-500 text-black transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
    </section>
  );
}
