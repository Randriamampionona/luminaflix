"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Minimum time on the launch screen so the logo animation can play. */
const MIN_SPLASH_MS = 1400;

/**
 * Leaves /launch for the real home page once the logo has drawn itself and
 * the home page is prefetched — so the switch is instant, with no blank screen.
 */
export default function LaunchRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(to);
    const timer = setTimeout(() => router.replace(to), Math.max(0, MIN_SPLASH_MS - performance.now()));
    return () => clearTimeout(timer);
  }, [router, to]);

  return null;
}
