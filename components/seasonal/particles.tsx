"use client";

import { useEffect, useRef } from "react";

type Mode = "snow" | "confetti" | "hearts";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  phase: number;
}

const CONFETTI_COLORS = ["#22d3ee", "#3b82f6", "#f59e0b", "#ec4899", "#a855f7", "#10b981", "#facc15"];

/**
 * Light full-screen particles on one <canvas>: falling snow, a confetti burst
 * or floating hearts. Few particles, ~30 fps, paused while the tab is hidden,
 * nothing at all with reduced motion. `duration` (ms) stops it after a while.
 */
export default function Particles({ mode, count, duration }: { mode: Mode; count: number; duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const spawn = (initial: boolean): Particle => {
      if (mode === "confetti") {
        // Burst from the top center, spreading out.
        return {
          x: w / 2 + rand(-w * 0.15, w * 0.15),
          y: rand(-40, 0),
          vx: rand(-4.5, 4.5),
          vy: rand(1, 5),
          size: rand(5, 10),
          rot: rand(0, Math.PI),
          vr: rand(-0.2, 0.2),
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          phase: rand(0, Math.PI * 2),
        };
      }
      if (mode === "hearts") {
        return {
          x: rand(0, w),
          y: initial ? rand(0, h) : h + 20,
          vx: 0,
          vy: -rand(0.3, 0.8),
          size: rand(8, 16),
          rot: 0,
          vr: 0,
          color: Math.random() > 0.5 ? "rgba(244,63,94,0.55)" : "rgba(236,72,153,0.45)",
          phase: rand(0, Math.PI * 2),
        };
      }
      return {
        x: rand(0, w),
        y: initial ? rand(0, h) : -10,
        vx: 0,
        vy: rand(0.4, 1.2),
        size: rand(1.5, 3.8),
        rot: 0,
        vr: 0,
        color: `rgba(255,255,255,${rand(0.45, 0.9).toFixed(2)})`,
        phase: rand(0, Math.PI * 2),
      };
    };
    let particles = Array.from({ length: count }, () => spawn(true));

    const heart = (x: number, y: number, s: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3);
      ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
      ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
      ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
      ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
      ctx.fill();
    };

    let frame = 0;
    let last = 0;
    const started = performance.now();
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 33) return; // ~30 fps is plenty for decorations
      last = now;
      if (duration && now - started > duration) {
        ctx.clearRect(0, 0, w, h);
        cancelAnimationFrame(frame);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.phase += 0.03;
        if (mode === "confetti") {
          p.vy += 0.08;
          p.vx *= 0.99;
        }
        p.x += p.vx + (mode === "confetti" ? 0 : Math.sin(p.phase) * 0.4);
        p.y += p.vy;
        p.rot += p.vr;
        ctx.fillStyle = p.color;
        if (mode === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else if (mode === "hearts") {
          heart(p.x, p.y, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Recycle what left the screen (except a one-shot confetti burst).
      particles = particles.map((p) =>
        p.y > h + 20 || p.y < -40 || p.x < -40 || p.x > w + 40 ? (mode === "confetti" ? p : spawn(false)) : p,
      );
    };
    frame = requestAnimationFrame(draw);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, count, duration]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-80 h-full w-full" />;
}
