"use client";

import { useAuth } from "@clerk/nextjs";
import { Download, Heart, LogIn, MonitorSmartphone, Sparkles, UserPlus, X, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import SignInLink from "@/components/auth/sign-in-link";
import AnimatedLogo from "@/components/brand/animated-logo";
import { onGoodMoment } from "@/lib/good-moments";
import { schedulePrompt, setPromptOpen } from "@/lib/prompt-lock";

/**
 * Timing (per browser session — sessionStorage, reset when the tab closes):
 * first prompt 10 min after the visit started, then +5 min after each
 * "Maybe later": 15 min, 20 min, 25 min…
 */
const FIRST_DELAY_MS = 10 * 60 * 1000;
const STEP_MS = 5 * 60 * 1000;
const KEYS = {
  start: "auth_prompt_session_start",
  dismissCount: "auth_prompt_dismiss_count",
  nextTrigger: "auth_prompt_next_trigger",
} as const;
/** Never over these pages (the sign-in pages themselves, the launch screen, admin pages, offline). */
const HIDDEN_ON = ["/sign-in", "/sign-up", "/launch", "/offline", "/analytics", "/media-infos", "/bot-filter"];

const read = (key: string) => {
  try {
    return Number(sessionStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
const write = (key: string, value: number) => {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    // storage blocked: the timer still works for this page
  }
};

/** Delay after the Nth "Maybe later": 15, 20, 25… minutes. */
const backoffMs = (dismissCount: number) => FIRST_DELAY_MS + dismissCount * STEP_MS;

const BENEFITS: { key: "watchlist" | "sync" | "picks" | "downloads"; icon: LucideIcon }[] = [
  { key: "watchlist", icon: Heart },
  { key: "sync", icon: MonitorSmartphone },
  { key: "picks", icon: Sparkles },
  { key: "downloads", icon: Download },
];

/**
 * Invites anonymous visitors to sign in or create an account — only for
 * signed-out users (never mounted timers otherwise), 10 min into the visit,
 * then 15 / 20 / 25… min after each "Maybe later". One popup at a time with
 * the notification and install prompts, and never during full-screen playback.
 */
export default function AuthPromptModal() {
  const t = useTranslations("authPrompt");
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  /** Bumped after every dismissal to schedule the next prompt. */
  const [cycle, setCycle] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const anonymous = isLoaded && !isSignedIn;
  const eligible = anonymous && !HIDDEN_ON.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!eligible) return;
    // Offered at a good moment (12 min watched, 3rd visit, a share — lib/good-moments.ts),
    // then +5 min more after each "Maybe later" (15, 20, 25… min).
    let cancelPrompt: (() => void) | undefined;
    const stopWaiting = onGoodMoment(() => {
      const next = read(KEYS.nextTrigger);
      const delay = next ? Math.max(1_500, next - Date.now()) : 1_500;
      cancelPrompt = schedulePrompt(
        "auth",
        delay,
        () => {
          // Don't interrupt a movie in full screen: try again once it's closed.
          if (document.fullscreenElement) {
            const onExit = () => {
              if (document.fullscreenElement) return;
              document.removeEventListener("fullscreenchange", onExit);
              setCycle((n) => n + 1);
            };
            document.addEventListener("fullscreenchange", onExit);
            return;
          }
          setOpen(true);
        },
        2_000,
      );
    });
    return () => {
      stopWaiting();
      cancelPrompt?.();
    };
  }, [eligible, cycle]);

  /** "Maybe later" (also ✕, Escape, clicking outside): next prompt 15, 20, 25… min from now. */
  const later = useCallback(() => {
    const count = read(KEYS.dismissCount) + 1;
    write(KEYS.dismissCount, count);
    write(KEYS.nextTrigger, Date.now() + backoffMs(count));
    setOpen(false);
    setCycle((n) => n + 1);
  }, []);

  /** Going to sign in / sign up: if they come back still signed out, ask again after the current interval. */
  const leaving = useCallback(() => {
    write(KEYS.nextTrigger, Date.now() + backoffMs(read(KEYS.dismissCount)));
    setOpen(false);
  }, []);

  const visible = open && eligible;

  useEffect(() => {
    setPromptOpen("auth", visible);
    return () => setPromptOpen("auth", false);
  }, [visible]);

  // Dialog behaviour: Escape = "Maybe later", focus on the main button, no page scroll behind.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && later();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [visible, later]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={later}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        aria-describedby="auth-prompt-body"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950/85 text-white shadow-[0_24px_90px_-20px_rgba(6,182,212,0.55)] backdrop-blur-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div
          aria-hidden
          className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-cyan-400 via-cyan-500 to-blue-500"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-3xl"
        />

        <button
          type="button"
          onClick={later}
          aria-label={t("close")}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative space-y-6 p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <AnimatedLogo size={64} />
            <p className="mt-4 text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">{t("eyebrow")}</p>
            <h2 id="auth-prompt-title" className="mt-2 text-2xl leading-tight font-black tracking-tight">
              {t("title")}
            </h2>
            <p id="auth-prompt-body" className="mt-2 text-sm leading-relaxed text-zinc-400">
              {t("body")}
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-2">
            {BENEFITS.map(({ key, icon: Icon }) => (
              <li key={key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="mt-2 text-xs font-bold text-white">{t(`benefits.${key}.title`)}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-400">{t(`benefits.${key}.body`)}</p>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <SignInLink
              route="/sign-up"
              onNavigate={leaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 text-[11px] font-black tracking-widest text-black uppercase shadow-[0_14px_40px_-12px_rgba(6,182,212,0.9)] transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              {t("signUp")}
            </SignInLink>
            <SignInLink
              route="/sign-in"
              onNavigate={leaving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-[11px] font-black tracking-widest text-white uppercase transition-colors hover:border-cyan-500/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {t("signIn")}
            </SignInLink>
            <button
              type="button"
              onClick={later}
              className="w-full cursor-pointer rounded-2xl py-2.5 text-[11px] font-bold tracking-widest text-zinc-400 uppercase transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {t("later")}
            </button>
            <p className="text-center text-[11px] text-zinc-500">{t("free")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
