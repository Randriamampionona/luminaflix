"use client";

import { useEffect, useRef } from "react";

/**
 * A small character that follows the mouse with a soft delay (desktop only,
 * never with reduced motion). One requestAnimationFrame loop that stops as
 * soon as the character has caught up — no work while the mouse is still.
 */
export default function CursorFollower({
  children,
  offsetX = 22,
  offsetY = 18,
}: {
  children: React.ReactNode;
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

    const step = () => {
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      const tilt = Math.max(-18, Math.min(18, (tx - x) * 0.6));
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt}deg)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      tx = e.clientX + offsetX;
      ty = e.clientY + offsetY;
      el.style.opacity = "1";
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
      cancelAnimationFrame(frame);
    };
  }, [offsetX, offsetY]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-90 opacity-0 transition-opacity duration-300 will-change-transform"
    >
      {children}
    </div>
  );
}
