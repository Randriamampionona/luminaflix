"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPreviewTrailer } from "@/action/get-preview-trailer.action";
import { getPref } from "@/lib/user-prefs";

const HOVER_DELAY_MS = 700;
const LONG_PRESS_MS = 500;
const keys = new Map<string, string | null>();
/** Only one preview plays at a time. */
let stopCurrent: (() => void) | null = null;

async function trailerKey(id: number, kind: string) {
  const cacheKey = `${kind}:${id}`;
  if (keys.has(cacheKey)) return keys.get(cacheKey) ?? null;
  const key = await getPreviewTrailer(id, kind).catch(() => null);
  keys.set(cacheKey, key);
  return key;
}

/**
 * Muted trailer preview on a card: after a short hover (mouse) or a long
 * press (touch). Never with data saver or reduced motion. Returns the props
 * to spread on the card and the overlay to render inside the poster box.
 */
export function useHoverTrailer(id: number, kind: string) {
  const [key, setKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setKey(null);
  }, []);

  const start = useCallback(
    (delay: number) => {
      if (getPref("dataSaver") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const found = await trailerKey(id, kind);
        if (!found || !timer.current) return;
        stopCurrent?.();
        stopCurrent = stop;
        longPressed.current = delay === LONG_PRESS_MS;
        setKey(found);
      }, delay);
    },
    [id, kind, stop],
  );

  useEffect(() => () => stop(), [stop]);

  const handlers = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && start(HOVER_DELAY_MS),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && stop(),
    onTouchStart: () => start(LONG_PRESS_MS),
    onTouchMove: () => !key && stop(),
    onTouchEnd: () => {
      if (!key && timer.current) stop();
    },
    onContextMenu: (e: React.MouseEvent) => {
      if (timer.current || key) e.preventDefault();
    },
    /** After a long press, the tap that ends it closes the preview instead of opening the card. */
    onClickCapture: (e: React.MouseEvent) => {
      if (longPressed.current && key) {
        e.stopPropagation();
        e.preventDefault();
        longPressed.current = false;
        stop();
      }
    },
  };

  const overlay = key ? (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-black animate-in fade-in duration-500">
      <iframe
        title="Trailer preview"
        src={`https://www.youtube-nocookie.com/embed/${key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${key}&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`}
        allow="autoplay; encrypted-media"
        className="absolute top-1/2 left-1/2 h-[120%] w-[340%] -translate-x-1/2 -translate-y-1/2 border-0"
        tabIndex={-1}
      />
    </div>
  ) : null;

  return { handlers, overlay };
}
