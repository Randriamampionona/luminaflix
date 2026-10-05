"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * "AI search" preference (on by default), persisted in localStorage and
 * shared by every search bar. When off, searches go out with `?ai=0`
 * (exact words only).
 */
const STORAGE_KEY = "luminaflix:smart-search";
const EVENT = "luminaflix:smart-search";

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
};

export function useSmartSearch() {
  const enabled = useSyncExternalStore(subscribe, read, () => true);

  const setEnabled = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
    } catch {
      // storage blocked: preference lasts for this page only
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  /** `/search/<query>` (AI on) or `/search/<query>?ai=0` (exact words). */
  const searchHref = useCallback(
    (base: string, query: string) => `${base}/${encodeURIComponent(query)}${enabled ? "" : "?ai=0"}`,
    [enabled],
  );

  return { enabled, setEnabled, searchHref };
}