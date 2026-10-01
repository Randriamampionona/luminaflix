"use client";

import { useEffect, useRef } from "react";
import type { NewestUser } from "@/action/get-newest-users.action";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const SPEED_PX_PER_SECOND = 28;
const RESUME_DELAY_MS = 1500;

function UserChip({ user, hidden }: { user: NewestUser; hidden?: boolean }) {
  return (
    <li
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-surface py-1 pr-4 pl-1 shadow-sm"
    >
      {user.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Clerk avatar (the global image loader is TMDB-only)
        <img
          src={user.imageUrl}
          alt=""
          loading="lazy"
          className="size-8 rounded-full border border-line-strong object-cover"
        />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-full bg-linear-to-tr from-cyan-500 to-blue-600 text-[11px] font-black text-white">
          {user.initials}
        </span>
      )}
      <span className="text-xs font-bold whitespace-nowrap text-foreground">{user.name}</span>
    </li>
  );
}

/**
 * Endless, auto-scrolling strip of avatars. It is a real scroll container,
 * so it can also be swiped / dragged / scrolled with a trackpad; auto-play
 * pauses while the user interacts (and on hover / keyboard focus), then
 * resumes. With reduced motion it's a plain swipeable list.
 */
export default function NewUsersCarousel({ users }: { users: NewestUser[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;

    let raf = 0;
    let last = performance.now();
    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;
    let position = el.scrollLeft;

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      const half = el.scrollWidth / 2; // the list is rendered twice
      if (!paused && half > el.clientWidth) {
        position += SPEED_PX_PER_SECOND * dt;
        if (position >= half) position -= half;
        el.scrollLeft = position;
      }
      raf = requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
      clearTimeout(resumeTimer);
    };
    const resume = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        // Continue from wherever the user left it, wrapped into the first copy.
        const half = el.scrollWidth / 2;
        position = half > 0 ? ((el.scrollLeft % half) + half) % half : el.scrollLeft;
        el.scrollLeft = position;
        paused = false;
      }, RESUME_DELAY_MS);
    };

    const events: [string, () => void][] = [
      ["pointerenter", pause],
      ["pointerleave", resume],
      ["touchstart", pause],
      ["touchend", resume],
      ["focusin", pause],
      ["focusout", resume],
      ["wheel", () => (pause(), resume())],
    ];
    events.forEach(([name, fn]) => el.addEventListener(name, fn, { passive: true }));
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      events.forEach(([name, fn]) => el.removeEventListener(name, fn));
    };
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className="no-scrollbar min-w-0 flex-1 overflow-x-auto mask-[linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
    >
      <ul className="flex w-max gap-3 py-1 pr-3">
        {users.map((user) => (
          <UserChip key={user.id} user={user} />
        ))}
        {/* Second copy for the seamless loop (hidden from assistive tech). */}
        {!reducedMotion && users.map((user) => <UserChip key={`${user.id}-loop`} user={user} hidden />)}
      </ul>
    </div>
  );
}