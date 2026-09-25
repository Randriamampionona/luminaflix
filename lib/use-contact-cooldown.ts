"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * "Wait a bit before sending another message", persisted in localStorage so
 * it survives reloads and applies across tabs. The server enforces the same
 * delay per IP, so clearing storage doesn't bypass it.
 */
const STORAGE_KEY = "luminaflix:contact:cooldown-until";
const CHANGE_EVENT = "luminaflix:contact-cooldown";

function readUntil(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0; // storage blocked (private mode…)
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useContactCooldown() {
  // 0 on the server and during hydration → no mismatch; real value right after.
  const storedUntil = useSyncExternalStore(subscribe, readUntil, () => 0);
  // In-memory copy, so the countdown still works when storage is blocked.
  const [localUntil, setLocalUntil] = useState(0);
  const until = Math.max(storedUntil, localUntil);
  const [now, setNow] = useState(0);

  // Tick once per second while a cooldown is running.
  useEffect(() => {
    if (!until) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(() => {
      tick();
      if (Date.now() >= until) clearInterval(id);
    }, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [until]);

  const remaining = until && now ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;

  const start = useCallback((seconds: number) => {
    const value = Date.now() + seconds * 1000;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Storage unavailable: the server-side cooldown still applies.
    }
    setLocalUntil(value);
    setNow(Date.now());
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { remaining, active: remaining > 0, start };
}