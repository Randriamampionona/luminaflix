"use client";

import { BellRing, Clapperboard, Film, Megaphone, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PUSH_OPT_OUT_KEY, usePushNotifications } from "@/hooks/use-push-notifications";

/** Timestamp of the last "Not now" (or refusal). The card comes back 24 h later. */
const DISMISSED_KEY = "fcm_prompt_dismissed_at";
const RETRY_AFTER_MS = 86_400_000; // 24 h
/** Let people look around before asking. */
const SHOW_DELAY_MS = 8_000;
const HIDDEN_ON = ["/sign-in", "/sign-up"];

const readNumber = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const remember = (key: string) => {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // storage blocked: the card simply comes back next visit
  }
};

/**
 * Soft permission prompt for push notifications (signed-in users only).
 * The real browser prompt only opens when the user clicks "Turn on", which
 * keeps the "Block" rate low. "Not now" hides it for 24 hours.
 */
export default function FcmPermissionModal() {
  const t = useTranslations("push.modal");
  const pathname = usePathname();
  const { supported, permission, isSignedIn, busy, enable } = usePushNotifications();
  const [open, setOpen] = useState(false);

  const eligible =
    supported && isSignedIn && permission === "default" && !HIDDEN_ON.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!eligible) return;
    if (readNumber(PUSH_OPT_OUT_KEY)) return; // turned off in the menu: don't nag
    const dismissedAt = readNumber(DISMISSED_KEY);
    if (dismissedAt && Date.now() - dismissedAt < RETRY_AFTER_MS) return;
    const timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  const dismiss = useCallback(() => {
    remember(DISMISSED_KEY);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  const allow = async () => {
    const result = await enable();
    if (result === "enabled") {
      toast.success(t("enabled"));
      setOpen(false);
      return;
    }
    remember(DISMISSED_KEY);
    setOpen(false);
    toast.error(result === "denied" ? t("denied") : t("failed"));
  };

  if (!open || !eligible) return null;

  const bullets = [
    { icon: Clapperboard, text: t("bullet1") },
    { icon: Sparkles, text: t("bullet2") },
    { icon: Megaphone, text: t("bullet3") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="push-prompt-title"
      aria-describedby="push-prompt-body"
      className="fixed inset-x-3 bottom-3 z-110 animate-in fade-in slide-in-from-bottom-8 duration-500 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-100"
    >
      <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-[0_24px_80px_-20px_rgba(6,182,212,0.45)]">
        <div
          aria-hidden
          className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-cyan-400 via-cyan-500 to-blue-500"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl"
        />

        <button
          type="button"
          onClick={dismiss}
          aria-label={t("close")}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative space-y-5 p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-4 pr-8">
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 animate-ping rounded-2xl bg-cyan-500/30 [animation-iteration-count:3] motion-reduce:hidden"
              />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-blue-600 text-white shadow-[0_8px_24px_-8px_rgba(6,182,212,0.8)]">
                <BellRing className="h-6 w-6 origin-top animate-[push-bell_2.4s_ease-in-out_infinite] motion-reduce:animate-none" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">{t("eyebrow")}</p>
              <h2 id="push-prompt-title" className="text-lg leading-tight font-black tracking-tight text-foreground">
                {t("title")}
              </h2>
            </div>
          </div>

          <p id="push-prompt-body" className="text-sm leading-relaxed text-fg-muted">
            {t("body")}
          </p>

          {/* What a notification looks like */}
          <div aria-hidden className="rounded-2xl border border-line bg-background/70 p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-sm font-black italic text-black">
                L
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-fg-subtle">{t("previewApp")}</p>
                <p className="truncate text-xs font-bold text-foreground">{t("previewTitle")}</p>
                <p className="line-clamp-2 text-[11px] leading-snug text-fg-muted">{t("previewBody")}</p>
              </div>
              <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-amber-700 via-orange-900 to-stone-900 text-white/70">
                <Film className="h-4 w-4" />
              </span>
            </div>
          </div>

          <ul className="space-y-2">
            {bullets.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-xs font-semibold text-fg-soft">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-brand">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={allow}
              disabled={busy}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 disabled:cursor-wait disabled:opacity-60"
            >
              <BellRing className="h-4 w-4" aria-hidden />
              {t("allow")}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="cursor-pointer rounded-2xl border border-line-strong px-4 text-[11px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {t("later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
