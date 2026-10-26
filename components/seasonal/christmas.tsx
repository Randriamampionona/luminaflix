"use client";

import CursorFollower from "./cursor-follower";
import Particles from "./particles";

const BULB_COLORS = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899"];
const SEGMENTS = 14;

/**
 * A wire hanging in loops under the navigation bar (stretched SVG) with a glass
 * bulb at the bottom of each loop (real-size elements, so bulbs keep their
 * shape on any screen width). Bulbs glow in turn and sway a little.
 */
function Lights() {
  const w = 1000;
  const step = w / SEGMENTS;
  let wire = `M0 2`;
  for (let i = 0; i < SEGMENTS; i++) wire += ` Q${step * i + step / 2} 30 ${step * (i + 1)} 2`;
  return (
    <div className="fixed inset-x-0 top-16 z-40 h-10 sm:top-[4.4rem]" aria-hidden>
      <svg viewBox={`0 0 ${w} 40`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={wire} stroke="#3f3f46" strokeWidth="1.3" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const color = BULB_COLORS[i % BULB_COLORS.length];
        return (
          <span
            key={i}
            // Bottom of loop i: x = middle of the segment, y = 40% of the height.
            className={`absolute top-[40%] origin-top animate-[bulb-sway_3s_ease-in-out_infinite] motion-reduce:animate-none ${
              i % 2 ? "max-sm:hidden" : ""
            }`}
            style={{ left: `${((i + 0.5) / SEGMENTS) * 100}%`, animationDelay: `${(i % 4) * 0.4}s` }}
          >
            <svg viewBox="-6 0 12 24" className="-ml-1.5 h-5 w-3 overflow-visible">
              <ellipse
                cx="0"
                cy="13"
                rx="7"
                ry="9"
                fill={color}
                opacity="0.35"
                className="animate-[bulb-twinkle_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: `${(i % 5) * 0.45}s`, filter: "blur(2px)" }}
              />
              <rect x="-2.3" y="0" width="4.6" height="5" rx="1" fill="#52525b" />
              <path
                d="M-3.6 5 C-5 10 -3.8 18 0 22 C3.8 18 5 10 3.6 5 Z"
                fill={color}
                className="animate-[bulb-twinkle_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: `${(i % 5) * 0.45}s` }}
              />
              <path
                d="M-1.7 8 C-2.3 11 -1.9 14 -0.9 16.5"
                stroke="white"
                strokeWidth="0.9"
                opacity="0.65"
                fill="none"
              />
            </svg>
          </span>
        );
      })}
    </div>
  );
}

/** Layered fir with snowy tips, a gold garland, glowing baubles and a shining star. */
function Tree() {
  const baubles = [
    [33, 30, "#ef4444"],
    [24, 41, "#facc15"],
    [41, 45, "#3b82f6"],
    [18, 56, "#ec4899"],
    [33, 59, "#facc15"],
    [48, 61, "#ef4444"],
    [27, 70, "#3b82f6"],
    [42, 72, "#22d3ee"],
  ] as const;
  return (
    <svg viewBox="0 0 66 92" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="fir" x1="0" x2="1">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
        <radialGradient id="star-halo">
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="29" y="78" width="8" height="11" rx="1.5" fill="#78350f" />
      {/* three tiers, bottom first so upper tiers overlap */}
      <path d="M33 44 L60 80 Q33 86 6 80 Z" fill="url(#fir)" />
      <path d="M33 28 L54 62 Q33 67 12 62 Z" fill="url(#fir)" />
      <path d="M33 12 L47 44 Q33 48 19 44 Z" fill="url(#fir)" />
      {/* snow on the tier edges */}
      <path
        d="M6 80 Q33 86 60 80 Q55 78 50 80 Q45 78 40 81 Q35 79 30 81 Q24 78 19 80 Q13 78 6 80 Z"
        fill="#f8fafc"
        opacity="0.9"
      />
      <path
        d="M12 62 Q33 67 54 62 Q49 60 44 62 Q38 60 33 63 Q27 60 22 62 Q17 60 12 62 Z"
        fill="#f8fafc"
        opacity="0.85"
      />
      <path d="M19 44 Q33 48 47 44 Q42 42 37 44 Q32 42 27 44 Q23 42 19 44 Z" fill="#f8fafc" opacity="0.8" />
      {/* garland */}
      <path d="M17 52 Q33 60 51 50 M13 70 Q33 79 56 68" stroke="#facc15" strokeWidth="1.2" fill="none" opacity="0.85" />
      {baubles.map(([x, y, c], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r="5"
            fill={c}
            opacity="0.3"
            className="animate-[bulb-twinkle_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
          <circle cx={x} cy={y} r="2.6" fill={c} />
          <circle cx={x - 0.8} cy={y - 0.9} r="0.8" fill="white" opacity="0.7" />
        </g>
      ))}
      <circle
        cx="33"
        cy="9"
        r="11"
        fill="url(#star-halo)"
        className="animate-[star-glow_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <path
        d="M33 1 L35.2 6.6 L41 6.8 L36.4 10.3 L38 16 L33 12.6 L28 16 L29.6 10.3 L25 6.8 L30.8 6.6 Z"
        fill="#fde047"
      />
    </svg>
  );
}

/** Wrapped gift with a satin ribbon and a shine. */
export function GiftBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden>
      <defs>
        <linearGradient id="gift-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="gift-ribbon" x1="0" x2="1">
          <stop offset="0%" stopColor="#ca8a04" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      {/* sparkles escaping when the lid pops */}
      <g className="animate-[gift-sparkle_7s_ease-out_infinite] motion-reduce:hidden" fill="#fde047">
        <path d="M14 8 L15 11 L18 12 L15 13 L14 16 L13 13 L10 12 L13 11 Z" />
        <path d="M30 4 L30.8 6.2 L33 7 L30.8 7.8 L30 10 L29.2 7.8 L27 7 L29.2 6.2 Z" />
        <circle cx="22" cy="5" r="1.2" />
      </g>
      <rect x="5" y="19" width="34" height="23" rx="2.5" fill="url(#gift-paper)" />
      <rect x="19" y="19" width="6" height="23" fill="url(#gift-ribbon)" />
      <path d="M8 23 L8 38" stroke="white" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
      {/* lid + bow */}
      <g className="origin-[3px_20px] animate-[gift-pop_7s_ease-in-out_infinite] motion-reduce:animate-none">
        <rect x="3" y="13" width="38" height="9" rx="2.5" fill="#ef4444" />
        <rect x="3" y="20" width="38" height="2" fill="#000" opacity="0.15" />
        <rect x="19" y="13" width="6" height="9" fill="url(#gift-ribbon)" />
        <path d="M22 13 C14 1 4 6 11 13 Z" fill="url(#gift-ribbon)" />
        <path d="M22 13 C30 1 40 6 33 13 Z" fill="url(#gift-ribbon)" />
        <circle cx="22" cy="13" r="2.6" fill="#facc15" />
      </g>
    </svg>
  );
}

function Snowman() {
  return (
    <svg
      viewBox="-2 -4 42 56"
      className="h-11 w-8 animate-[ghost-float_2.4s_ease-in-out_infinite] drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] motion-reduce:animate-none"
      aria-hidden
    >
      <defs>
        <radialGradient id="snow-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </radialGradient>
      </defs>
      <path d="M8 33 L1 27 M3.5 29.5 L1.5 31" stroke="#78350f" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path
        d="M30 33 L37 25 M34.5 28 L37.5 29"
        stroke="#78350f"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        className="origin-[30px_33px] animate-[arm-wave_1.6s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
      />
      <circle cx="19" cy="38" r="12" fill="url(#snow-ball)" />
      <circle cx="19" cy="19" r="8.5" fill="url(#snow-ball)" />
      <path d="M8 9 L30 9 L28 6 L10 6 Z" fill="#111827" />
      <rect x="12" y="-2" width="14" height="9" rx="1.5" fill="#111827" />
      <rect x="12" y="4" width="14" height="2" fill="#dc2626" />
      <g className="origin-center animate-[blink_4.2s_ease-in-out_infinite] [transform-box:fill-box] motion-reduce:animate-none">
        <circle cx="16" cy="17.5" r="1.2" fill="#111827" />
        <circle cx="22" cy="17.5" r="1.2" fill="#111827" />
      </g>
      <path d="M19 19.5 L26 21 L19 22.5 Z" fill="#f97316" />
      <path d="M10 26 Q19 31 28 26 L28 29 Q19 34 10 29 Z" fill="#dc2626" />
      <path d="M24 29 L27 38 L23 37 Z" fill="#b91c1c" />
      <circle cx="19" cy="35" r="1.2" fill="#111827" />
      <circle cx="19" cy="40" r="1.2" fill="#111827" />
    </svg>
  );
}

/** Christmas: snowfall with depth, a string of lights, a snowy tree with a gift, and a snowman following the mouse. */
export default function Christmas() {
  return (
    <div aria-hidden className="pointer-events-none">
      <Particles mode="snow" count={55} />
      <Lights />
      <div className="fixed bottom-1.5 left-2 z-40 flex items-end gap-1 sm:bottom-2.5 sm:left-4">
        <div className="h-18 w-13 sm:h-24 sm:w-17">
          <Tree />
        </div>
        <GiftBox className="h-8 w-8 origin-bottom animate-[gift-wiggle_6s_ease-in-out_infinite] sm:h-10 sm:w-10 motion-reduce:animate-none" />
      </div>
      <CursorFollower say="Brrr! ❄️">
        <Snowman />
      </CursorFollower>
    </div>
  );
}
