/**
 * Monetag Smartlinks on the app's links and buttons.
 *
 * A "cycle" starts at the first eligible click: the first 1 or 2 clicks of the
 * cycle open a Smartlink in a new tab (and do nothing else), the following
 * clicks work normally. When the cycle's time is up, the next click starts a
 * new one. Clicks captured per cycle alternate (2, 1, 2, 1…) and each cycle
 * lasts 5 s longer than the previous one:
 *   cycle 1: 2 clicks, 10 s · cycle 2: 1 click, 15 s · cycle 3: 2 clicks, 20 s · cycle 4: 1 click, 25 s …
 * State lives in sessionStorage (per tab; a new tab / visit starts over).
 * Each link or button always gets the same Smartlink (chosen from its target
 * or label), the 7 Smartlinks being spread across the app.
 */
const SMARTLINKS = [
  "https://uplcm.com/4/12199443",
  "https://uplcm.com/4/12199446",
  "https://uplcm.com/4/12199452",
  "https://uplcm.com/4/12199467",
  "https://uplcm.com/4/12199468",
  "https://uplcm.com/4/12199470",
  "https://uplcm.com/4/12199471",
] as const;

/** Clicks opening a Smartlink per cycle (alternating). Max 2. */
const CAPTURES_PER_CYCLE = [2, 1];
/** First cycle length, then +5 s per cycle (10 s, 15 s, 20 s, 25 s…). */
const FIRST_CYCLE_MS = 10_000;
const CYCLE_STEP_MS = 5_000;
const STORAGE_KEY = "lf_smartlink_cycle";

interface Cycle {
  /** Smartlink clicks left in this cycle. */
  remaining: number;
  /** When the cycle ends (ms). */
  endsAt: number;
  /** Cycle number (0, 1, 2…), for the alternation. */
  round: number;
}

function read(): Cycle | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Cycle) : null;
  } catch {
    return null;
  }
}

function write(cycle: Cycle) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cycle));
  } catch {
    // storage blocked: no Smartlinks rather than one on every click
  }
}

/** Should this click open a Smartlink? (Counts it if so.) */
export function takeSmartlinkClick(now = Date.now()): boolean {
  let cycle = read();
  if (!cycle || now >= cycle.endsAt) {
    const round = cycle ? cycle.round + 1 : 0;
    cycle = {
      round,
      remaining: CAPTURES_PER_CYCLE[round % CAPTURES_PER_CYCLE.length],
      endsAt: now + FIRST_CYCLE_MS + round * CYCLE_STEP_MS,
    };
  }
  if (cycle.remaining <= 0) {
    write(cycle);
    return false;
  }
  write({ ...cycle, remaining: cycle.remaining - 1 });
  // Storage unavailable → never capture (avoid capturing every click).
  return read() !== null;
}

/** Gives back a click when the Smartlink couldn't open (popup blocked). */
export function refundSmartlinkClick() {
  const cycle = read();
  if (cycle) write({ ...cycle, remaining: cycle.remaining + 1 });
}

/** The Smartlink assigned to a link / button (always the same for the same one). */
export function smartlinkFor(key: string) {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  return SMARTLINKS[Math.abs(hash) % SMARTLINKS.length];
}
