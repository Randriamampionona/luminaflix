"use client";

import { Loader2, RotateCw } from "lucide-react";
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
 * Grab handle at the top center of every page (a 4 × 4 dot grid): hold it and
 * pull down, release past the threshold → loading animation → the handle goes
 * back up → hard reload of the app. A simple click shows how to use it.
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

  return (
    <div
      data-no-smartlink
      className="pointer-events-none fixed top-0 left-1/2 z-[110] flex -translate-x-1/2 flex-col items-center"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Pull track + indicator (appears while pulling) */}
      <div
        aria-hidden
        className={cn(
          "absolute top-0 flex w-px justify-center bg-linear-to-b from-cyan-500/0 to-cyan-500/60",
          animating && "transition-[height] duration-300 ease-out",
        )}
        style={{ height: pull }}
      />
      <div
        className={cn(
          "pointer-events-auto relative flex flex-col items-center",
          animating && "transition-transform duration-300 ease-out",
        )}
        style={{ transform: `translateY(${pull}px)` }}
      >
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
            "touch-none select-none rounded-b-xl border border-t-0 px-2.5 py-1.5 shadow-lg backdrop-blur-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
            phase === "pulling" ? "cursor-grabbing" : "cursor-grab",
            ready || phase === "loading"
              ? "border-cyan-500/60 bg-cyan-500/20"
              : "border-line-strong bg-surface/70 hover:bg-surface",
          )}
        >
          {phase === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" aria-hidden />
          ) : (
            <span aria-hidden className="grid grid-cols-4 gap-[2px]">
              {Array.from({ length: 16 }, (_, i) => (
                <span
                  key={i}
                  className={cn("h-[2.5px] w-[2.5px] rounded-full", ready ? "bg-cyan-400" : "bg-fg-subtle")}
                />
              ))}
            </span>
          )}
        </div>

        {/* While pulling: "Pull to reload" → "Release to reload" · then "Reloading…" */}
        {(phase === "pulling" && pull > 12) || phase === "loading" ? (
          <span className="mt-2 flex items-center gap-1.5 rounded-full border border-line-strong bg-surface/90 px-3 py-1 text-[10px] font-bold whitespace-nowrap text-fg-soft shadow-lg backdrop-blur-md">
            {phase === "loading" ? (
              t("reloading")
            ) : (
              <>
                <RotateCw
                  className={cn("h-3 w-3 transition-transform", ready && "text-brand")}
                  style={{ transform: `rotate(${Math.round((pull / THRESHOLD) * 270)}deg)` }}
                  aria-hidden
                />
                {ready ? t("release") : t("pull")}
              </>
            )}
          </span>
        ) : null}

        {/* After a simple click */}
        {hint && phase === "idle" && (
          <span
            role="status"
            className="mt-2 rounded-xl border border-line-strong bg-surface/95 px-3 py-2 text-[11px] font-semibold whitespace-nowrap text-fg-soft shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-1"
          >
            {t("hint")}
          </span>
        )}
      </div>
    </div>
  );
}
