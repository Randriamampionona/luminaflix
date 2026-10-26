"use client";

import CursorFollower from "./cursor-follower";

/** Spider web drawn with a few radial and spiral strokes. */
function Web({ className }: { className?: string }) {
  const spokes = [0, 15, 30, 45, 60, 75, 90];
  const rings = [22, 42, 64, 88, 112];
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <g stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round">
        {spokes.map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1="120" y1="0" x2={120 - Math.cos(r) * 120} y2={Math.sin(r) * 120} />;
        })}
        {rings.map((radius) => (
          <path
            key={radius}
            d={spokes
              .map((a, i) => {
                const r = (a * Math.PI) / 180;
                // Slight sag between spokes, like a real web.
                const x = 120 - Math.cos(r) * radius;
                const y = Math.sin(r) * radius;
                return `${i === 0 ? "M" : "Q"}${i === 0 ? "" : `${120 - Math.cos(r - 0.13) * (radius - 4)} ${Math.sin(r - 0.13) * (radius - 4)} `}${x} ${y}`;
              })
              .join(" ")}
          />
        ))}
      </g>
    </svg>
  );
}

function Spider() {
  return (
    <svg viewBox="0 0 40 34" className="h-7 w-8 text-zinc-900 dark:text-zinc-300" aria-hidden>
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        className="origin-center animate-[spider-legs_0.6s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
      >
        <path d="M14 15 Q6 8 2 12M14 18 Q5 16 1 20M15 21 Q7 24 3 30M16 23 Q11 28 9 33" />
        <path d="M26 15 Q34 8 38 12M26 18 Q35 16 39 20M25 21 Q33 24 37 30M24 23 Q29 28 31 33" />
      </g>
      <ellipse cx="20" cy="20" rx="7" ry="8" fill="currentColor" />
      <circle cx="20" cy="11" r="4.5" fill="currentColor" />
      <circle cx="18.3" cy="10.5" r="1.1" fill="#f97316" />
      <circle cx="21.7" cy="10.5" r="1.1" fill="#f97316" />
    </svg>
  );
}

function Pumpkin() {
  return (
    <svg viewBox="0 0 64 60" className="h-full w-full" aria-hidden>
      <path d="M31 8 C30 3 33 1 36 2" stroke="#4d7c0f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="18" cy="34" rx="15" ry="20" fill="#ea580c" />
      <ellipse cx="46" cy="34" rx="15" ry="20" fill="#ea580c" />
      <ellipse cx="32" cy="34" rx="16" ry="22" fill="#f97316" />
      <path d="M22 16 Q32 30 22 52M42 16 Q32 30 42 52" stroke="#c2410c" strokeWidth="1.5" fill="none" opacity="0.6" />
      <g fill="#fde047" className="animate-[pumpkin-flicker_2.4s_ease-in-out_infinite] motion-reduce:animate-none">
        <path d="M17 28 L25 28 L21 21 Z" />
        <path d="M39 28 L47 28 L43 21 Z" />
        <path d="M30 33 L34 33 L32 29 Z" />
        <path d="M15 39 Q32 52 49 39 L45 41 L42 38 L38 42 L34 39 L30 42 L26 39 L22 42 L19 38 Z" />
      </g>
    </svg>
  );
}

function Ghost() {
  return (
    <svg
      viewBox="0 0 40 46"
      className="h-10 w-9 animate-[ghost-float_2.2s_ease-in-out_infinite] drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <path
        d="M20 2 C9 2 4 11 4 21 L4 42 L9 37 L14 42 L20 37 L26 42 L31 37 L36 42 L36 21 C36 11 31 2 20 2 Z"
        fill="#f8fafc"
      />
      <ellipse cx="14.5" cy="19" rx="3" ry="4" fill="#111" />
      <ellipse cx="25.5" cy="19" rx="3" ry="4" fill="#111" />
      <ellipse cx="20" cy="29" rx="3.2" ry="4" fill="#111" />
      <circle cx="11" cy="25" r="2" fill="#fda4af" opacity="0.6" />
      <circle cx="29" cy="25" r="2" fill="#fda4af" opacity="0.6" />
    </svg>
  );
}

function Bat() {
  return (
    <svg viewBox="0 0 60 26" className="h-5 w-12 text-zinc-900 dark:text-violet-300/80" aria-hidden>
      <path
        className="origin-center animate-[bat-flap_0.28s_ease-in-out_infinite_alternate]"
        d="M30 10 C24 0 14 0 0 6 C8 8 10 14 8 20 C14 15 20 16 24 20 C26 16 28 14 30 14 C32 14 34 16 36 20 C40 16 46 15 52 20 C50 14 52 8 60 6 C46 0 36 0 30 10 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Halloween: corner webs, a spider going up and down, a glowing pumpkin, bats and a ghost that follows the mouse. */
export default function Halloween() {
  return (
    <div aria-hidden className="pointer-events-none">
      {/* Top-right web (under the navigation bar) with the spider on its thread */}
      <div className="fixed top-16 right-0 z-40 sm:top-[4.4rem]">
        <Web className="h-24 w-24 text-zinc-400/60 sm:h-36 sm:w-36 dark:text-zinc-500/50" />
        <div className="absolute top-0 right-7 flex animate-[spider-drop_9s_ease-in-out_infinite] flex-col items-center sm:right-10 motion-reduce:animate-none">
          <span className="h-16 w-px bg-zinc-400/70 sm:h-24" />
          <Spider />
        </div>
      </div>

      {/* Bottom-left web + glowing pumpkin */}
      <div className="fixed bottom-0 left-0 z-40">
        <Web className="h-20 w-20 -scale-100 text-zinc-400/50 sm:h-28 sm:w-28 dark:text-zinc-500/40" />
        <div className="absolute bottom-2 left-3 h-11 w-12 animate-[pumpkin-glow_2.4s_ease-in-out_infinite] sm:bottom-3 sm:left-5 sm:h-14 sm:w-15 motion-reduce:animate-none">
          <Pumpkin />
        </div>
      </div>

      {/* Bats crossing now and then */}
      <div className="fixed top-28 left-0 z-40 animate-[bat-fly_26s_linear_infinite] motion-reduce:hidden">
        <Bat />
      </div>
      <div className="fixed top-44 left-0 z-40 animate-[bat-fly_34s_linear_9s_infinite] opacity-80 motion-reduce:hidden">
        <Bat />
      </div>

      <CursorFollower>
        <Ghost />
      </CursorFollower>
    </div>
  );
}
