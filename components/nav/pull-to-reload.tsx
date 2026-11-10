"use client";

import { ChevronDown, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Pull distance (px, after resistance) that triggers the reload. */
const THRESHOLD = 90;
const MAX_PULL = 140;
const LOADING_MS = 900;
const RETURN_MS = 350;

type Phase = "idle" | "pulling" | "loading" | "returning";

/**
 * Grab handle at the top center of every page — a small glass tab with a ﹀
 * chevron that gently nudges down: hold it and pull down (a ring fills up),
 * release past the threshold → loading animation → the handle glides back up
 * → hard reload of the app. A simple click shows how to use it.
 * Works with mouse, touch and pen; Enter / Space reloads from the keyboard.
 * Excluded from the Smartlinks (data-no-smartlink).
 */
export default function PullToReload() {
  const t = useTranslations("pullToReload");
  const [pull, setPull] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hint, setHint] = useState(false);
  const start = useRef<{ y: number; id: number } | null>(null);
  const moved = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const showHint = () => {
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 3000);
  };

  const reload = async () => {
    setPhase("loading");
    setPull(THRESHOLD);
    setHint(false);
    // Fetch the newest app version if the service worker has one.
    const update = navigator.serviceWorker
      ?.getRegistration()
      .then((reg) => reg?.update())
      .catch(() => {});
    await Promise.all([update, new Promise((r) => setTimeout(r, LOADING_MS))]);
    setPhase("returning");
    setPull(0);
    await new Promise((r) => setTimeout(r, RETURN_MS));
    window.location.reload();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "loading" || phase === "returning") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, id: e.pointerId };
    moved.current = false;
    setPhase("pulling");
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > 4) moved.current = true;
    // Rubber band: the further you pull, the harder it gets.
    const value = dy <= 0 ? 0 : Math.min(MAX_PULL, dy * 0.6);
    setPull(value);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current || start.current.id !== e.pointerId) return;
    start.current = null;
    if (!moved.current) {
      // A simple click: explain how it works.
      setPhase("idle");
      setPull(0);
      showHint();
      return;
    }
    if (pull >= THRESHOLD) {
      void reload();
    } else {
      setPhase("returning");
      setPull(0);
      setTimeout(() => setPhase("idle"), RETURN_MS);
    }
  };

  const ready = pull >= THRESHOLD;
  const animating = phase === "returning" || phase === "loading";
  const progress = Math.min(1, pull / THRESHOLD);
  const showBadge = (phase === "pulling" && pull > 12) || phase === "loading";

  return (
    <div
      data-no-smartlink
      className="pointer-events-none fixed top-0 left-1/2 z-[110] flex -translate-x-1/2 flex-col items-center"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Gentle "pull me" nudge of the chevron (idle only) */}
      <style>{`@keyframes lf-pull-nudge{0%,70%,100%{transform:translateY(0);opacity:.75}82%{transform:translateY(2px);opacity:1}}`}</style>

      {/* Light beam that follows the pull */}
      <div
        aria-hidden
        className={cn(
          "absolute top-0 w-0.5 rounded-full bg-linear-to-b from-transparent via-cyan-400/40 to-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.6)]",
          animating && "transition-[height] duration-300 ease-out",
        )}
        style={{ height: pull }}
      />

      <div
        className={cn(
          "pointer-events-auto relative flex flex-col items-center",
          animating && "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
        style={{ transform: `translateY(${pull}px)` }}
      >
        {/* The handle: a glass tab with a ﹀ chevron */}
        <div
          role="button"
          tabIndex={0}
          aria-label={t("label")}
          title={t("label")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void reload();
            }
          }}
          className={cn(
            "group relative flex h-5 w-12 touch-none select-none items-center justify-center overflow-hidden rounded-b-2xl border border-t-0 backdrop-blur-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
            phase === "pulling" ? "cursor-grabbing" : "cursor-grab hover:h-6 hover:w-14",
            ready || phase === "loading"
              ? "border-cyan-400/60 bg-cyan-500/25 shadow-[0_6px_24px_-4px_rgba(6,182,212,0.7)]"
              : "border-white/10 bg-surface/55 shadow-[0_6px_20px_-8px_rgba(6,182,212,0.45)] hover:border-cyan-400/40",
          )}
        >
          {/* Thin cyan line under the tab */}
          <span
            aria-hidden
            className="absolute inset-x-3 bottom-0 h-px bg-linear-to-r from-transparent via-cyan-400/80 to-transparent"
          />
          <ChevronDown
            aria-hidden
            strokeWidth={2.5}
            className={cn(
              "h-4 w-4 transition-[color,transform] duration-300",
              ready || phase === "loading" ? "text-cyan-300" : "text-fg-muted group-hover:text-cyan-300",
              ready && "rotate-180",
            )}
            style={phase === "idle" ? { animation: "lf-pull-nudge 2.8s ease-in-out infinite" } : undefined}
          />
        </div>

        {/* While pulling: progress ring + "Pull to reload" → "Release to reload" · then "Reloading…" */}
        {showBadge && (
          <span className="mt-2.5 flex items-center gap-2 rounded-full border border-white/10 bg-surface/85 py-1 pr-3.5 pl-1 text-[10px] font-black tracking-wider whitespace-nowrap text-fg-soft uppercase shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className={cn("absolute inset-0 -rotate-90", phase === "loading" && "animate-spin")}
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2" className="stroke-white/10" />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="stroke-cyan-400 transition-[stroke-dashoffset] duration-150"
                  strokeDasharray={62.83}
                  strokeDashoffset={phase === "loading" ? 47 : 62.83 * (1 - progress)}
                />
              </svg>
              <RotateCw
                aria-hidden
                className={cn("h-3 w-3", ready || phase === "loading" ? "text-cyan-300" : "text-fg-subtle")}
                style={phase === "loading" ? undefined : { transform: `rotate(${Math.round(progress * 300)}deg)` }}
              />
            </span>
            <span className={cn(ready || phase === "loading" ? "text-cyan-300" : undefined)}>
              {phase === "loading" ? t("reloading") : ready ? t("release") : t("pull")}
            </span>
          </span>
        )}

        {/* After a simple click */}
        {hint && phase === "idle" && (
          <span
            role="status"
            className="mt-2.5 flex items-center gap-2 rounded-xl border border-white/10 bg-surface/90 px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-fg-soft shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-top-1"
          >
            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
            {t("hint")}
          </span>
        )}
      </div>
    </div>
  );
}
