"use client";

import {
  AppWindow,
  BellRing,
  Check,
  Download,
  EllipsisVertical,
  HardDrive,
  MonitorDown,
  MonitorPlay,
  Share,
  SquarePlus,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type InstallPlatform, usePWAInstall } from "@/hooks/use-pwa-install";
import { schedulePrompt, setPromptOpen } from "@/lib/prompt-lock";

/** Delay before the popup appears (override with NEXT_PUBLIC_PWA_PROMPT_DELAY_MS). */
const SHOW_DELAY_MS = Number(process.env.NEXT_PUBLIC_PWA_PROMPT_DELAY_MS) || 10_000;
/** "Maybe later" hides the popup for this long. */
const SNOOZE_MS = 30 * 60 * 1000;
const DISMISSED_KEY = "lf_pwa_dismissed_at";
const HIDDEN_ON = ["/sign-in", "/sign-up", "/analytics", "/offline"];

const readNumber = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};
/** Step-by-step install instructions when the browser has no one-tap install (yet). */
const MANUAL_STEPS: Record<Exclude<InstallPlatform, "unsupported">, { key: string; icon: LucideIcon }[]> = {
  ios: [
    { key: "iosStep1", icon: Share },
    { key: "iosStep2", icon: SquarePlus },
    { key: "iosStep3", icon: Check },
  ],
  android: [
    { key: "androidStep1", icon: EllipsisVertical },
    { key: "androidStep2", icon: SquarePlus },
    { key: "androidStep3", icon: Check },
  ],
  desktop: [
    { key: "desktopStep1", icon: MonitorDown },
    { key: "desktopStep2", icon: AppWindow },
    { key: "desktopStep3", icon: Check },
  ],
  "mac-safari": [
    { key: "macStep1", icon: Share },
    { key: "macStep2", icon: SquarePlus },
    { key: "macStep3", icon: Check },
  ],
};

const snooze = () => {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // storage blocked: the popup comes back next visit
  }
};

/**
 * "Install LuminaFlix" popup, 10 s after arrival; "Maybe later" brings it back 30 min later.
 * - One-tap "Install app" when the browser offers it (Chrome / Edge / Android,
 *   usually after the visitor has interacted with the page a little).
 * - Otherwise the steps for this browser: iPhone/iPad, Android menu, desktop
 *   address-bar icon, or Safari "Add to Dock". Desktop Firefox can't install: no popup.
 * - Never shown in the installed app, after an install, or while another
 *   popup (push notifications) is open.
 */
export default function PWAInstallModal() {
  const t = useTranslations("pwa");
  const pathname = usePathname();
  const { canInstall, isInstalled, platform, promptInstall } = usePWAInstall();
  const [open, setOpen] = useState(false);
  /** Bumped on every dismissal to schedule the next reminder. */
  const [cycle, setCycle] = useState(0);
  const [busy, setBusy] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Shown in every browser that can install web apps — with a one-tap button when
  // the browser offers it, otherwise with the steps for that browser.
  const eligible =
    !isInstalled && (canInstall || platform !== "unsupported") && !HIDDEN_ON.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (!eligible) return;
    // After "Maybe later": ask again once 30 min have passed — on a later visit,
    // or during this one if the visitor is still here.
    const dismissedAt = readNumber(DISMISSED_KEY);
    // Counted from the moment the page started loading, not from this check.
    const sinceArrival = Math.max(300, SHOW_DELAY_MS - performance.now());
    const delay = dismissedAt ? Math.max(sinceArrival, dismissedAt + SNOOZE_MS - Date.now()) : sinceArrival;
    // If the notification popup is open at that moment, wait until it's closed (+2 s).
    return schedulePrompt("install", delay, () => setOpen(true), 2_000);
  }, [eligible, cycle]);

  useEffect(() => {
    setPromptOpen("install", open && eligible);
    return () => setPromptOpen("install", false);
  }, [open, eligible]);

  const later = useCallback(() => {
    snooze();
    setOpen(false);
    setCycle((n) => n + 1);
  }, []);

  // Dialog behaviour: Escape closes, focus on the main button, no page scroll behind.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && later();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    primaryRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, later]);

  const install = async () => {
    setBusy(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success(t("installed"));
        setOpen(false);
      } else {
        later(); // dismissed in the browser dialog: same as "Maybe later"
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open || !eligible) return null;

  const perks = [
    { icon: Zap, text: t("perk1") },
    { icon: MonitorPlay, text: t("perk2") },
    { icon: BellRing, text: t("perk3") },
    { icon: HardDrive, text: t("perk4") },
  ];
  // No one-tap install: show this browser's steps instead.
  const manualSteps = !canInstall && platform !== "unsupported" ? MANUAL_STEPS[platform] : null;

  return (
    <div
      className="fixed inset-0 z-110 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:items-center sm:p-4"
      onClick={later}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        aria-describedby="pwa-install-body"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-line-strong bg-surface shadow-[0_24px_80px_-20px_rgba(6,182,212,0.45)] animate-in slide-in-from-bottom-8 duration-300 sm:zoom-in-95"
      >
        <div
          aria-hidden
          className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-cyan-400 via-cyan-500 to-blue-500"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-3xl"
        />

        <button
          type="button"
          onClick={later}
          aria-label={t("close")}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative space-y-5 p-6 text-center">
          {/* App icon */}
          <div className="relative mx-auto w-fit">
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-[1.4rem] bg-cyan-500/25 [animation-iteration-count:2] motion-reduce:hidden"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static app icon, TMDB-only image loader */}
            <img
              src="/icons/icon-192.png"
              alt=""
              width={80}
              height={80}
              className="relative h-20 w-20 rounded-[1.4rem] shadow-[0_12px_32px_-8px_rgba(6,182,212,0.7)] ring-1 ring-line-strong"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">{t("eyebrow")}</p>
            <h2 id="pwa-install-title" className="text-xl leading-tight font-black tracking-tight text-foreground">
              {t("title")}
            </h2>
            <p id="pwa-install-body" className="text-sm leading-relaxed text-fg-muted">
              {t("body")}
            </p>
          </div>

          {manualSteps ? (
            // No install button in this browser (yet): explain the steps.
            <ol className="space-y-2 text-left">
              {manualSteps
                .map(({ key, icon: Icon }) => ({ icon: Icon, text: t(key as "iosStep1") }))
                .map(({ icon: Icon, text }, index) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-tint-soft px-4 py-3 text-xs font-semibold text-fg-soft"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-black text-black">
                      {index + 1}
                    </span>
                    <span className="flex-1">{text}</span>
                    <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                  </li>
                ))}
            </ol>
          ) : (
            <ul className="grid grid-cols-2 gap-2 text-left">
              {perks.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-tint-soft px-3 py-2.5 text-xs font-semibold text-fg-soft"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-brand">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {manualSteps ? (
              <button
                ref={primaryRef}
                type="button"
                onClick={later}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40"
              >
                <Check className="h-4 w-4" aria-hidden />
                {t("gotIt")}
              </button>
            ) : (
              <>
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={install}
                  disabled={busy}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 disabled:cursor-wait disabled:opacity-60"
                >
                  <Download className={busy ? "h-4 w-4 animate-bounce" : "h-4 w-4"} aria-hidden />
                  {t("install")}
                </button>
                <button
                  type="button"
                  onClick={later}
                  className="cursor-pointer rounded-2xl border border-line-strong px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {t("later")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
