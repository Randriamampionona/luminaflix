"use client";

import { ArrowRight, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { PlayerKind } from "./providers";

/** Seconds before switching to the English server on its own. */
const COUNTDOWN_SECONDS = 10;

/**
 * Shown over the player when the title isn't on Frembed (VF/VOSTFR):
 * explains it and switches to an English server after a countdown —
 * or right away with the button. "Stay on FR" cancels.
 */
export default function FrUnavailableBanner({
  kind,
  onSwitch,
  onDismiss,
}: {
  kind: PlayerKind;
  onSwitch: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("player.availability");
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      onSwitch();
      return;
    }
    const timer = setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, onSwitch]);

  return (
    // Mobile: centered popup over the whole player (dimmed), never cut off.
    // Desktop: card in the bottom-left corner (the floating download button is on the right), video still visible.
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-2.5 backdrop-blur-[2px] animate-in fade-in duration-300 sm:p-4 md:inset-auto md:bottom-4 md:left-4 md:block md:bg-transparent md:p-0 md:backdrop-blur-none">
      <div
        role="status"
        aria-live="polite"
        className="relative max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-amber-400/30 bg-zinc-950/95 p-3 text-white shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300 sm:p-4 md:w-[28rem] md:max-w-none md:slide-in-from-bottom-4"
      >
        {/* Countdown progress */}
        <div
          aria-hidden
          className="absolute top-0 left-0 h-0.5 bg-amber-400 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(seconds / COUNTDOWN_SECONDS) * 100}%` }}
        />
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("stay")}
          className="absolute top-2 right-2 cursor-pointer rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-2.5 pr-7 sm:gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300 sm:h-9 sm:w-9 sm:rounded-xl">
            <Info className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-0.5 sm:space-y-1">
            <p className="text-[13px] leading-snug font-bold sm:text-sm">{t(`unavailable.${kind}`)}</p>
            <p className="line-clamp-2 text-[11px] leading-snug text-zinc-400 sm:text-xs sm:leading-relaxed">
              {t("hint")}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2 sm:mt-3">
          <button
            type="button"
            onClick={onSwitch}
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-[10px] font-black tracking-wider text-black uppercase transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-widest"
          >
            <span className="truncate sm:hidden">{t("switchShort")}</span>
            <span className="hidden truncate sm:inline">{t("switch")}</span>
            <span className="shrink-0 rounded-md bg-black/15 px-1.5 py-0.5 tabular-nums">{seconds}s</span>
            <ArrowRight className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-[10px] font-black tracking-wider text-zinc-300 uppercase transition-colors hover:text-white sm:px-4 sm:py-2.5 sm:text-[11px] sm:tracking-widest"
          >
            {t("stay")}
          </button>
        </div>
      </div>
    </div>
  );
}
