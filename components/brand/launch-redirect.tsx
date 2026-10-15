"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Minimum time on the launch screen so the logo animation can play. */
const MIN_SPLASH_MS = 1400;

/**
 * Where the launch screen goes next: `?to=/movies` (app shortcuts) or the home
 * page, always tagged `source=pwa`. Same logic as the inline fallback script in
 * app/launch/page.tsx. Only same-site paths are accepted.
 */
function launchTarget(search: string) {
  const to = new URLSearchParams(search).get("to");
  const path = to && to.startsWith("/") && !to.startsWith("//") ? to : "/";
  return path + (path.includes("?") ? "&" : "?") + "source=pwa";
}

/**
 * Leaves /launch once the logo has drawn itself; the next page is prefetched
 * so the switch is instant. (A plain redirect in the page HTML takes over if
 * this ever fails.)
 */
export default function LaunchRedirect() {
  const router = useRouter();

  useEffect(() => {
    const target = launchTarget(window.location.search);
    router.prefetch(target);
    const timer = setTimeout(() => router.replace(target), Math.max(0, MIN_SPLASH_MS - performance.now()));
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
