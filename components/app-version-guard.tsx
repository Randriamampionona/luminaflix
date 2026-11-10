"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "";
const CHECK_EVERY_MS = 2 * 60_000;
const PLAYER_PAGE = /^\/(movies\/[^/]+|k-drama\/play\/|tv-shows\/play\/|anime\/play\/)/;

/**
 * A tab left open keeps running the version of the app it was opened with,
 * even after a new version is deployed — old code, old behaviour (e.g. the old
 * availability check) until a manual reload. This guard asks the server which
 * version is live (on load, every 2 min, and when the tab comes back) and, when
 * it's newer, loads it: at the next page change, or right away when a player
 * page is open and nothing is playing yet.
 */
export default function AppVersionGuard() {
  const pathname = usePathname();
  const outdated = useRef(false);
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (!CURRENT) return;
    const check = async () => {
      if (outdated.current) return;
      try {
        const res = await fetch(`/api/version?_=${Date.now()}`, { cache: "no-store" });
        const { version } = (await res.json()) as { version?: string };
        if (version && version !== CURRENT) {
          outdated.current = true;
          // On a player page with no video started yet (no player iframe): reload now.
          if (PLAYER_PAGE.test(window.location.pathname) && !document.querySelector("iframe[allow*='fullscreen']")) {
            window.location.reload();
          }
        }
      } catch {
        // offline: try again later
      }
    };
    void check();
    const timer = setInterval(() => void check(), CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // New version known: the next page change is a full load of the new version.
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    if (outdated.current) window.location.reload();
  }, [pathname]);

  return null;
}
