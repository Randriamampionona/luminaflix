"use client";

import { useSyncExternalStore } from "react";
import { GiftBox } from "./christmas";
import Particles from "./particles";

const KEY = "lf_newyear_confetti";
const noop = () => () => {};
/** Confetti once per visit (tab), not on every page. */
const shouldBurst = () => {
  try {
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, "1");
    return true;
  } catch {
    return false;
  }
};
let burstDecision: boolean | null = null;
const burstSnapshot = () => (burstDecision ??= shouldBurst());

/** New Year: a confetti burst when the visit starts, a gift and a "Happy New Year" sparkle in the corner. */
export default function NewYear() {
  const burst = useSyncExternalStore(noop, burstSnapshot, () => false);
  const now = new Date();
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  return (
    <div aria-hidden className="pointer-events-none">
      {burst && <Particles mode="confetti" count={140} duration={7000} />}
      <div className="fixed bottom-2 left-2 z-40 flex items-end gap-2 sm:bottom-3 sm:left-4">
        <GiftBox className="h-9 w-9 origin-bottom animate-[gift-wiggle_4s_ease-in-out_infinite] sm:h-11 sm:w-11 motion-reduce:animate-none" />
        <span className="mb-1 rounded-full bg-linear-to-r from-amber-300 via-yellow-200 to-amber-400 px-2.5 py-1 text-[10px] font-black tracking-widest text-black shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-[star-glow_2.5s_ease-in-out_infinite] motion-reduce:animate-none">
          ✨ {year}
        </span>
      </div>
    </div>
  );
}
