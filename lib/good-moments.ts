"use client";

/**
 * "Good moments" to ask for things (install the app, create an account):
 * after a satisfying moment rather than on a timer —
 *   - the visitor watched for 12 minutes (components/player/stream-player.tsx)
 *   - their 3rd visit, after 45 s on the site (components/engagement-tracker.tsx)
 *   - they just shared a title (components/share/share-card.tsx)
 * Once one happened in this tab, later listeners fire right away.
 */
const EVENT = "lf:good-moment";
const FLAG = "lf_good_moment";

type GoodMoment = "watched" | "visits" | "shared";

export function markGoodMoment(reason: GoodMoment) {
  try {
    sessionStorage.setItem(FLAG, reason);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: reason }));
}

/** Calls `callback` at the first good moment of this tab (now if one already happened). Returns an unsubscribe. */
export function onGoodMoment(callback: () => void): () => void {
  let done = false;
  const fire = () => {
    if (done) return;
    done = true;
    callback();
  };
  try {
    if (sessionStorage.getItem(FLAG)) {
      const t = setTimeout(fire, 0);
      return () => clearTimeout(t);
    }
  } catch {
    // ignore
  }
  window.addEventListener(EVENT, fire);
  return () => window.removeEventListener(EVENT, fire);
}
