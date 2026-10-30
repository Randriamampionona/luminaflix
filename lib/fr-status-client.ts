"use client";

import { useEffect, useState } from "react";
import type { MediaKind } from "@/lib/media";

/** VF / VOSTFR availability of a card (batched: one request per ~40 cards). */
type FrStatus = "vf" | "vostfr" | "both" | "fr" | "none" | "unknown";

const cache = new Map<string, FrStatus>();
const waiting = new Map<string, ((status: FrStatus) => void)[]>();
const queue: { key: string; kind: MediaKind; id: number }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const batch = queue.splice(0, 40);
  if (queue.length) timer = setTimeout(flush, 30);
  try {
    const res = await fetch("/api/fr-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: batch.map(({ kind, id }) => ({ kind, id })) }),
    });
    const { results } = (await res.json()) as { results: Record<string, FrStatus> };
    for (const { key } of batch) settle(key, results[key] ?? "unknown");
  } catch {
    for (const { key } of batch) settle(key, "unknown");
  }
}

function settle(key: string, status: FrStatus) {
  if (status !== "unknown") cache.set(key, status);
  (waiting.get(key) ?? []).forEach((resolve) => resolve(status));
  waiting.delete(key);
}

function request(kind: MediaKind, id: number): Promise<FrStatus> {
  const key = `${kind}:${id}`;
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const list = waiting.get(key);
    if (list) return list.push(resolve);
    waiting.set(key, [resolve]);
    queue.push({ key, kind, id });
    if (!timer) timer = setTimeout(flush, 60);
  });
}

/** Status of a title, fetched only while `enabled` (e.g. "VF / VOSTFR only" is on). */
export function useFrStatus(kind: MediaKind, id: number, enabled: boolean): FrStatus | undefined {
  const key = `${kind}:${id}`;
  const [result, setResult] = useState<{ key: string; status: FrStatus } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void request(kind, id).then((status) => {
      if (active) setResult({ key, status });
    });
    return () => {
      active = false;
    };
  }, [enabled, kind, id, key]);
  if (!enabled) return undefined;
  return cache.get(key) ?? (result?.key === key ? result.status : undefined);
}
