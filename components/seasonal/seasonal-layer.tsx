"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { currentSeasonalEvent, type SeasonalEvent } from "@/lib/seasonal";
import { usePref } from "@/lib/user-prefs";

/**
 * Event-based decorations (Halloween, Christmas, New Year, Valentine's Day).
 * Outside an event nothing is rendered and nothing is downloaded: each theme
 * is its own chunk, loaded only on its dates. Purely decorative: never
 * clickable (pointer-events: none), hidden from screen readers, calm when the
 * visitor prefers reduced motion.
 */
const THEMES: Record<SeasonalEvent, React.ComponentType> = {
  halloween: dynamic(() => import("./halloween"), { ssr: false }),
  christmas: dynamic(() => import("./christmas"), { ssr: false }),
  newyear: dynamic(() => import("./new-year"), { ssr: false }),
  valentine: dynamic(() => import("./valentine"), { ssr: false }),
};

/** Pages that stay plain. */
const HIDDEN_ON = ["/launch", "/bot-filter", "/offline", "/sign-in", "/sign-up"];

const noop = () => () => {};

export default function SeasonalLayer() {
  const pathname = usePathname();
  // Decided in the browser (the visitor's own date), never during server rendering.
  const event = useSyncExternalStore(
    noop,
    () => currentSeasonalEvent(),
    () => null,
  );
  // Data saver (menu → Preferences): no decorations.
  const dataSaver = usePref("dataSaver");
  if (!event || dataSaver || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  const Theme = THEMES[event];
  return <Theme />;
}
