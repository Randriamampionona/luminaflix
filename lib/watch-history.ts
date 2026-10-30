"use client";

import { useSyncExternalStore } from "react";
import type { MediaKind } from "@/lib/media";

/** Titles watched in this browser (latest first, max 20) — for "Because you watched …". */
interface WatchedItem {
  id: number;
  kind: MediaKind;
  title: string;
  at: number;
}

const KEY = "lf_watch_history";
const EVENT = "lf:watch-history";
const EMPTY: WatchedItem[] = [];
let cachedRaw: string | null = null;
let cachedList: WatchedItem[] = EMPTY;

function read(): WatchedItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    cachedList = raw ? (JSON.parse(raw) as WatchedItem[]) : EMPTY;
    return cachedList;
  } catch {
    return EMPTY;
  }
}

export function recordWatched(item: Omit<WatchedItem, "at">) {
  try {
    const list = read().filter((w) => !(w.id === item.id && w.kind === item.kind));
    localStorage.setItem(KEY, JSON.stringify([{ ...item, at: Date.now() }, ...list].slice(0, 20)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage blocked
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useWatchHistory() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
