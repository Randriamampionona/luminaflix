"use client";

import CursorFollower from "./cursor-follower";
import Particles from "./particles";

const BULB_COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899"];

/** A string of twinkling lights across the top, under the navigation bar. */
function Lights() {
  return (
    <div className="fixed inset-x-0 top-16 z-40 flex h-6 justify-around overflow-hidden sm:top-[4.4rem]">
      <svg className="absolute inset-x-0 top-0 h-3 w-full" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
        <path
          d="M0 1 Q5 8 10 1 T20 1 T30 1 T40 1 T50 1 T60 1 T70 1 T80 1 T90 1 T100 1"
          stroke="#3f3f46"
          strokeWidth="0.6"
          fill="none"
        />
      </svg>
      {Array.from({ length: 20 }, (_, i) => (
        <span
          key={i}
          className="mt-1.5 h-3 w-2 rounded-b-full animate-[bulb-twinkle_1.6s_ease-in-out_infinite] motion-reduce:animate-none max-sm:[&:nth-child(odd)]:hidden"
          style={{
            backgroundColor: BULB_COLORS[i % BULB_COLORS.length],
            boxShadow: `0 0 8px ${BULB_COLORS[i % BULB_COLORS.length]}`,
            animationDelay: `${(i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

function Tree() {
  const ornaments = [
    [30, 26, "#ef4444"],
    [22, 38, "#facc15"],
    [38, 40, "#3b82f6"],
    [16, 52, "#ec4899"],
    [32, 54, "#facc15"],
    [44, 56, "#ef4444"],
  ] as const;
  return (
    <svg viewBox="0 0 60 76" className="h-full w-full" aria-hidden>
      <rect x="26" y="62" width="8" height="10" rx="1" fill="#7c2d12" />
      <path d="M30 6 L48 30 L40 30 L54 48 L44 48 L58 64 L2 64 L16 48 L6 48 L20 30 L12 30 Z" fill="#15803d" />
      <path d="M30 6 L40 20 L30 18 L20 20 Z" fill="#16a34a" />
      {ornaments.map(([x, y, c], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="2.6"
          fill={c}
          className="animate-[bulb-twinkle_1.8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.25}s` }}
        />
      ))}
      <path
        d="M30 0 L32 5 L37 5 L33 8 L35 13 L30 10 L25 13 L27 8 L23 5 L28 5 Z"
        fill="#fde047"
        className="origin-center animate-[star-glow_2s_ease-in-out_infinite] motion-reduce:animate-none"
      />
    </svg>
  );
}

export function GiftBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect x="4" y="16" width="32" height="22" rx="2" fill="#dc2626" />
      <rect x="2" y="11" width="36" height="8" rx="2" fill="#ef4444" />
      <rect x="17" y="11" width="6" height="27" fill="#facc15" />
      <path d="M20 11 C14 2 6 6 12 11 Z M20 11 C26 2 34 6 28 11 Z" fill="#facc15" />
    </svg>
  );
}

function Snowman() {
  return (
    <svg
      viewBox="0 0 34 46"
      className="h-10 w-8 animate-[ghost-float_2.4s_ease-in-out_infinite] drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
      aria-hidden
    >
      <circle cx="17" cy="33" r="11" fill="#f8fafc" />
      <circle cx="17" cy="15" r="8" fill="#f8fafc" />
      <rect x="9" y="3" width="16" height="4" rx="1" fill="#111" />
      <rect x="12" y="-3" width="10" height="8" rx="1" fill="#111" />
      <circle cx="14" cy="14" r="1.2" fill="#111" />
      <circle cx="20" cy="14" r="1.2" fill="#111" />
      <path d="M17 16 L23 17.5 L17 18.5 Z" fill="#f97316" />
      <path d="M9 22 Q17 26 25 22" stroke="#dc2626" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="17" cy="30" r="1.2" fill="#111" />
      <circle cx="17" cy="35" r="1.2" fill="#111" />
    </svg>
  );
}

/** Christmas: light snowfall, a string of lights, a twinkling tree with a gift, and a snowman following the mouse. */
export default function Christmas() {
  return (
    <div aria-hidden className="pointer-events-none">
      <Particles mode="snow" count={45} />
      <Lights />
      <div className="fixed bottom-2 left-2 z-40 flex items-end gap-1 sm:bottom-3 sm:left-4">
        <div className="h-16 w-13 sm:h-20 sm:w-16">
          <Tree />
        </div>
        <GiftBox className="h-8 w-8 origin-bottom animate-[gift-wiggle_5s_ease-in-out_infinite] sm:h-10 sm:w-10 motion-reduce:animate-none" />
      </div>
      <CursorFollower>
        <Snowman />
      </CursorFollower>
    </div>
  );
}
