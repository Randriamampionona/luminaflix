"use client";

import CursorFollower from "./cursor-follower";

/**
 * Orb-weaver web anchored in a corner: radial spokes plus a capture spiral whose
 * threads sag between spokes, with a few dew drops catching the light.
 * Deterministic (no Math.random) so it renders the same everywhere.
 */
function Web({ size, className }: { size: number; className?: string }) {
  const spokes = 9;
  const rings = 9;
  const angle = (i: number) => (Math.PI / 2) * (i / (spokes - 1)); // 0 → 90°, out of the corner
  // Small, fixed irregularities so it doesn't look machine-drawn.
  const wobble = (i: number, k: number) => 1 + 0.06 * Math.sin(i * 12.9898 + k * 78.233);
  const point = (i: number, r: number) => [size - Math.cos(angle(i)) * r, Math.sin(angle(i)) * r] as const;

  const spokePaths = Array.from({ length: spokes }, (_, i) => {
    const [x, y] = point(i, size * 1.02);
    return `M${size} 0 L${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const ringPaths = Array.from({ length: rings }, (_, k) => {
    const base = size * (0.14 + (k / rings) * 0.84);
    let d = "";
    for (let i = 0; i < spokes; i++) {
      const [x, y] = point(i, base * wobble(i, k));
      if (i === 0) {
        d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
        continue;
      }
      // Sag toward the anchor between two spokes.
      const mid = (angle(i - 1) + angle(i)) / 2;
      const sag = base * (0.9 - 0.02 * k);
      d += ` Q${(size - Math.cos(mid) * sag).toFixed(1)} ${(Math.sin(mid) * sag).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  });
  const dew = [
    [2, 0.45],
    [5, 0.62],
    [7, 0.3],
    [4, 0.82],
  ].map(([i, f]) => point(i, size * f));

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {spokePaths.map((d) => (
          <path key={d} d={d} strokeWidth="0.7" opacity="0.75" />
        ))}
        {ringPaths.map((d, k) => (
          <path key={d} d={d} strokeWidth={0.55 - k * 0.02} opacity={0.85 - k * 0.04} />
        ))}
      </g>
      {dew.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.3"
          fill="white"
          className="animate-[dew-twinkle_3.5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.9}s` }}
        />
      ))}
    </svg>
  );
}

/**
 * Spider hanging head-down from its silk (the thread comes out of the
 * abdomen, like a real one): jointed legs walking in alternate pairs, glossy
 * abdomen, glowing eyes, and a front leg that waves hello at the bottom.
 */
function Spider() {
  // [shoulder angle°, knee distance, foot angle°] for the 4 legs of one side.
  const legs = [
    [-55, 9, -95],
    [-20, 10, -45],
    [15, 10, 40],
    [45, 9, 95],
  ];
  const leg = (side: 1 | -1, [a, len, f]: number[], i: number) => {
    const rad = (d: number) => (d * Math.PI) / 180;
    const sx = 20 + side * 3;
    const sy = 15 + i * 1.2;
    const kx = sx + side * Math.cos(rad(a)) * len;
    const ky = sy + Math.sin(rad(a)) * len - 4;
    const fx = kx + side * Math.cos(rad(f)) * len * 0.9;
    const fy = ky + Math.sin(rad(f)) * len * 0.9 + 4;
    return `M${sx} ${sy} L${kx.toFixed(1)} ${ky.toFixed(1)} L${fx.toFixed(1)} ${fy.toFixed(1)}`;
  };
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 text-zinc-900 dark:text-zinc-400" aria-hidden>
      <defs>
        <radialGradient id="spider-abdomen" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="60%" stopColor="currentColor" />
        </radialGradient>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <g className="origin-[20px_16px] animate-[spider-legs-a_0.9s_ease-in-out_infinite_alternate] motion-reduce:animate-none">
          {legs.map((l, i) => (i % 2 === 0 && i !== 0 ? <path key={`l${i}`} d={leg(-1, l, i)} /> : null))}
          {legs.map((l, i) => (i % 2 === 1 ? <path key={`r${i}`} d={leg(1, l, i)} /> : null))}
        </g>
        <g className="origin-[20px_16px] animate-[spider-legs-b_0.9s_ease-in-out_infinite_alternate] motion-reduce:animate-none">
          {legs.map((l, i) => (i % 2 === 1 ? <path key={`l${i}`} d={leg(-1, l, i)} /> : null))}
          {legs.map((l, i) => (i % 2 === 0 ? <path key={`r${i}`} d={leg(1, l, i)} /> : null))}
        </g>
      </g>
      {/* front leg that waves (synced with the descent: at the bottom of the thread) */}
      <path
        d={leg(-1, legs[0], 0)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="origin-[17px_15px] animate-[spider-wave_11s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <ellipse cx="20" cy="25" rx="7" ry="8.5" fill="url(#spider-abdomen)" />
      <path d="M20 19 L20 31 M17 23 L23 27 M23 23 L17 27" stroke="#f97316" strokeWidth="0.6" opacity="0.5" />
      <ellipse cx="20" cy="15" rx="4.2" ry="3.8" fill="currentColor" />
      <g className="origin-center animate-[blink_4.5s_ease-in-out_infinite] [transform-box:fill-box] motion-reduce:animate-none">
        <circle cx="18.5" cy="13.4" r="1.15" fill="#fb923c" />
        <circle cx="21.5" cy="13.4" r="1.15" fill="#fb923c" />
        <circle cx="17.2" cy="15.2" r="0.55" fill="#fb923c" />
        <circle cx="22.8" cy="15.2" r="0.55" fill="#fb923c" />
      </g>
    </svg>
  );
}

/** Carved jack-o'-lantern lit from the inside. */
function Pumpkin() {
  return (
    <svg viewBox="0 0 72 64" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="pumpkin-skin" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="45%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id="pumpkin-light" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#fef9c3" />
          <stop offset="55%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id="pumpkin-stem" x1="0" x2="1">
          <stop offset="0%" stopColor="#365314" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
      </defs>
      {/* ribs: back lobes darker, front lobe lighter */}
      <ellipse cx="18" cy="38" rx="16" ry="21" fill="url(#pumpkin-skin)" opacity="0.92" />
      <ellipse cx="54" cy="38" rx="16" ry="21" fill="url(#pumpkin-skin)" opacity="0.92" />
      <ellipse cx="27" cy="38" rx="15" ry="23" fill="url(#pumpkin-skin)" />
      <ellipse cx="45" cy="38" rx="15" ry="23" fill="url(#pumpkin-skin)" />
      <ellipse cx="36" cy="38" rx="13" ry="24" fill="url(#pumpkin-skin)" />
      <path
        d="M27 16 Q22 38 27 60 M45 16 Q50 38 45 60 M36 14 Q34 38 36 62"
        stroke="#7c2d12"
        strokeWidth="1.1"
        fill="none"
        opacity="0.35"
      />
      {/* curved stem + tendril */}
      <path d="M33 16 C32 9 34 4 40 2 C38 7 38 11 39 16 Z" fill="url(#pumpkin-stem)" />
      <path d="M39 9 C45 6 48 10 45 13 C43 15 46 17 48 15" stroke="#4d7c0f" strokeWidth="1" fill="none" />
      {/* carved face, glowing */}
      <g
        fill="url(#pumpkin-light)"
        className="animate-[pumpkin-flicker_3s_ease-in-out_infinite] motion-reduce:animate-none"
      >
        <path d="M20 31 L30 31 L25 22 Z" />
        <path
          d="M42 31 L52 31 L47 22 Z"
          className="origin-center animate-[wink_7s_ease-in-out_infinite] [transform-box:fill-box] motion-reduce:animate-none"
        />
        <path d="M33.5 37 L38.5 37 L36 32 Z" />
        <path d="M17 42 Q36 58 55 42 L52 47 L48 44 L44 49 L40 45 L36 50 L32 45 L28 49 L24 44 L20 47 Z" />
      </g>
    </svg>
  );
}

/** Translucent little ghost with a waving hem and blushing cheeks. */
function Ghost() {
  return (
    <svg
      viewBox="0 0 44 52"
      className="h-11 w-10 animate-[ghost-float_2.6s_ease-in-out_infinite] drop-shadow-[0_3px_8px_rgba(15,23,42,0.35)] motion-reduce:animate-none dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]"
      aria-hidden
    >
      <defs>
        <linearGradient id="ghost-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="75%" stopColor="#f1f5f9" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path
        className="origin-top animate-[ghost-hem_1.4s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        d="M22 2 C10 2 5 12 5 23 L5 44 C8 41 11 41 13 45 C15 49 18 49 20 45 C22 41 25 41 27 45 C29 49 32 49 34 45 C36 41 39 41 39 44 L39 23 C39 12 34 2 22 2 Z"
        fill="url(#ghost-body)"
      />
      <g className="origin-center animate-[blink_3.8s_ease-in-out_infinite] [transform-box:fill-box] motion-reduce:animate-none">
        <ellipse cx="16" cy="21" rx="3" ry="4.2" fill="#0f172a" />
        <ellipse cx="28" cy="21" rx="3" ry="4.2" fill="#0f172a" />
        <circle cx="17" cy="19.6" r="1" fill="#fff" />
        <circle cx="29" cy="19.6" r="1" fill="#fff" />
      </g>
      {/* mouth: small "o", opens wide for "Boo!" when the mouse rests */}
      <ellipse
        cx="22"
        cy="31"
        rx="3"
        ry="3.6"
        fill="#0f172a"
        className="origin-center transition-transform duration-300 [transform-box:fill-box] group-data-[idle=true]:scale-[1.35_1.6]"
      />
      <circle cx="12" cy="27" r="2.4" fill="#fda4af" opacity="0.55" />
      <circle cx="32" cy="27" r="2.4" fill="#fda4af" opacity="0.55" />
    </svg>
  );
}

/** Bat with two wings that flap around the shoulders. */
function Bat() {
  return (
    <svg viewBox="0 0 64 30" className="h-6 w-13 text-zinc-900 dark:text-violet-300/80" aria-hidden>
      <g fill="currentColor">
        <path
          className="origin-[30px_13px] animate-[bat-wing-l_0.32s_ease-in-out_infinite_alternate]"
          d="M30 13 C25 4 15 2 2 8 C8 10 9 15 7 20 C12 16 17 17 20 21 C22 17 26 15 30 15 Z"
        />
        <path
          className="origin-[34px_13px] animate-[bat-wing-r_0.32s_ease-in-out_infinite_alternate]"
          d="M34 13 C39 4 49 2 62 8 C56 10 55 15 57 20 C52 16 47 17 44 21 C42 17 38 15 34 15 Z"
        />
        <ellipse cx="32" cy="15" rx="3.6" ry="5" />
        <path d="M29.5 10.5 L30 7 L31.5 10 Z M34.5 10.5 L34 7 L32.5 10 Z" />
      </g>
      <circle cx="30.8" cy="13" r="0.7" fill="#f87171" />
      <circle cx="33.2" cy="13" r="0.7" fill="#f87171" />
    </svg>
  );
}

/**
 * Halloween: a web in two corners with a spider lowering itself on its silk
 * (the thread stays attached), a carved pumpkin lit from inside, bats
 * crossing now and then, and a ghost following the mouse.
 */
export default function Halloween() {
  return (
    <div aria-hidden className="pointer-events-none">
      {/* Top-right web under the navigation bar, with the spider */}
      <div className="fixed top-16 right-0 z-40 sm:top-[4.4rem]">
        <Web size={150} className="h-24 w-24 text-zinc-500/70 sm:h-36 sm:w-36 dark:text-zinc-400/45" />
        <div className="absolute top-[14%] right-[30%] [--drop:90px] sm:[--drop:140px]">
          {/* silk: grows from the web, the spider rides its end */}
          <span className="absolute top-0 left-1/2 block h-(--drop) w-px origin-top -translate-x-1/2 animate-[silk-grow_11s_ease-in-out_infinite] bg-linear-to-b from-zinc-400/30 to-zinc-400/80 motion-reduce:scale-y-50 motion-reduce:animate-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-[spider-ride_11s_ease-in-out_infinite] motion-reduce:translate-y-[calc(var(--drop)*0.5)] motion-reduce:animate-none">
            <div className="-mt-1.5 origin-top animate-[spider-sway_3.7s_ease-in-out_infinite] motion-reduce:animate-none">
              {/* head down, abdomen (and spinnerets) up against the silk */}
              <div className="rotate-180">
                <Spider />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-left: small web and the glowing pumpkin */}
      <div className="fixed bottom-0 left-0 z-40">
        <Web
          size={120}
          className="h-20 w-20 -scale-x-100 -scale-y-100 text-zinc-500/60 sm:h-28 sm:w-28 dark:text-zinc-400/35"
        />
        <div className="absolute bottom-1.5 left-3 h-12 w-13 animate-[pumpkin-glow_3s_ease-in-out_infinite] sm:bottom-2.5 sm:left-5 sm:h-15 sm:w-17 motion-reduce:animate-none">
          <Pumpkin />
        </div>
      </div>

      {/* Bats crossing now and then (left → right, then right → left) */}
      <div className="fixed top-32 left-0 z-40 animate-[bat-fly_24s_linear_infinite] motion-reduce:hidden">
        <Bat />
      </div>
      <div className="fixed top-52 left-0 z-40 scale-75 animate-[bat-fly-back_31s_linear_8s_infinite] opacity-80 motion-reduce:hidden">
        <Bat />
      </div>

      <CursorFollower say="Boo! 👻">
        <Ghost />
      </CursorFollower>
    </div>
  );
}
