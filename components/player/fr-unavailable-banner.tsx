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
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-x-3 bottom-3 z-20 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-4 md:left-auto md:w-[30rem]"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-zinc-950/90 p-4 text-white shadow-2xl backdrop-blur-xl">
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
          className="absolute top-2.5 right-2.5 cursor-pointer rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex gap-3 pr-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Info className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-snug font-bold">{t(`unavailable.${kind}`)}</p>
            <p className="text-xs leading-relaxed text-zinc-400">{t("hint")}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onSwitch}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-[11px] font-black tracking-widest text-black uppercase transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40"
          >
            {t("switch")}
            <span className="rounded-md bg-black/15 px-1.5 py-0.5 tabular-nums">{seconds}s</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="cursor-pointer rounded-xl border border-white/15 px-4 py-2.5 text-[11px] font-black tracking-widest text-zinc-300 uppercase transition-colors hover:text-white"
          >
            {t("stay")}
          </button>
        </div>
      </div>
    </div>
  );
}
