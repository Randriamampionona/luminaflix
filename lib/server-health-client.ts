"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Counts = Record<string, { ok?: number; bad?: number }>;
type Health = "good" | "bad" | null;

/** Server that worked last time for this title, remembered in this browser. */
const memKey = (kind: string, id: string) => `lf_server_${kind}_${id}`;
const EVENT = "lf:server-memory";

export function rememberServer(kind: string, id: string, providerId: string) {
  try {
    localStorage.setItem(memKey(kind, id), providerId);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function useRememberedServer(kind: string, id: string): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    () => {
      try {
        return localStorage.getItem(memKey(kind, id));
      } catch {
        return null;
      }
    },
    () => null,
  );
}

const score = (c?: { ok?: number; bad?: number }) => ((c?.ok ?? 0) + 1) / ((c?.ok ?? 0) + (c?.bad ?? 0) + 2);

/** Reports for this title / all titles → a sort score and a health dot per server. */
export function useServerHealth(kind: string, id: string) {
  const [data, setData] = useState<{ key: string; title: Counts; global: Counts } | null>(null);
  const key = `${kind}:${id}`;
  useEffect(() => {
    let active = true;
    fetch(`/api/player/health?kind=${kind}&id=${id}`)
      .then((r) => (r.ok ? r.json() : { title: {}, global: {} }))
      .then((d: { title: Counts; global: Counts }) => active && setData({ key, ...d }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [kind, id, key]);
  const current = data?.key === key ? data : null;
  return {
    /** Higher = better: this title's reports weigh 3× more than the global ones. */
    rank: (providerId: string) =>
      current ? 3 * score(current.title[providerId]) + score(current.global[providerId]) : 0,
    health: (providerId: string): Health => {
      const c = current?.title[providerId];
      if (!c) return null;
      if ((c.bad ?? 0) >= 2 && (c.bad ?? 0) > (c.ok ?? 0)) return "bad";
      if ((c.ok ?? 0) >= 2 && (c.ok ?? 0) >= (c.bad ?? 0) * 2) return "good";
      return null;
    },
  };
}
