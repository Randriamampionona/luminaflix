"use client";

import { useEffect, useRef } from "react";

/**
 * A small character that follows the mouse with a soft delay (desktop only,
 * never with reduced motion). One requestAnimationFrame loop that stops as
 * soon as the character has caught up — no work while the mouse is still.
 *
 * It turns to face where it's going (data-dir="left|right") and, after the
 * mouse has rested a moment, says something (`say`, shown while data-idle).
 */
const IDLE_MS = 2200;

export default function CursorFollower({
  children,
  say,
  offsetX = 22,
  offsetY = 18,
}: {
  children: React.ReactNode;
  /** Little speech bubble when the mouse rests ("Boo!"). */
  say?: string;
  offsetX?: number;
  offsetY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = -100;
    let y = -100;
    let tx = x;
    let ty = y;
    let frame = 0;
    let idleTimer = 0;

    const step = () => {
      const dx = tx - x;
      x += dx * 0.12;
      y += (ty - y) * 0.12;
      if (Math.abs(dx) > 2) el.dataset.dir = dx < 0 ? "left" : "right";
      const tilt = Math.max(-14, Math.min(14, dx * 0.5));
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX + offsetX;
      ty = e.clientY + offsetY;
      el.style.opacity = "1";
      el.dataset.idle = "false";
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => (el.dataset.idle = "true"), IDLE_MS);
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.clearTimeout(idleTimer);
      cancelAnimationFrame(frame);
    };
  }, [offsetX, offsetY]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-dir="right"
      data-idle="false"
      className="group pointer-events-none fixed top-0 left-0 z-90 opacity-0 transition-opacity duration-300 will-change-transform"
    >
      {say && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 scale-50 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-black whitespace-nowrap text-zinc-900 opacity-0 shadow-lg transition-all duration-300 group-data-[idle=true]:scale-100 group-data-[idle=true]:opacity-100">
          {say}
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-black/10 bg-white" />
        </span>
      )}
      {/* Faces the direction it's moving */}
      <div className="transition-transform duration-300 group-data-[dir=left]:-scale-x-100">{children}</div>
    </div>
  );
}
