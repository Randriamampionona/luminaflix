"use client";

import CursorFollower from "./cursor-follower";
import Particles from "./particles";

/** Valentine's Day: a few hearts floating up and a little heart following the mouse. */
export default function Valentine() {
  return (
    <div aria-hidden className="pointer-events-none">
      <Particles mode="hearts" count={14} />
      <CursorFollower say="💕">
        <svg
          viewBox="0 0 24 22"
          className="h-6 w-6 animate-[ghost-float_1.8s_ease-in-out_infinite] drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)]"
        >
          <path
            d="M12 21 C4 14 0 10 0 6 C0 2 3 0 6 0 C9 0 11 2 12 4 C13 2 15 0 18 0 C21 0 24 2 24 6 C24 10 20 14 12 21 Z"
            fill="#f43f5e"
          />
        </svg>
      </CursorFollower>
    </div>
  );
}
