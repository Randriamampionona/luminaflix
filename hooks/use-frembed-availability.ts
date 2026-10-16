"use client";

import { useEffect, useState } from "react";
import type { PlayerKind } from "@/components/player/providers";

type Status = "checking" | "available" | "unavailable" | "unknown";

/** Same title asked twice in a visit (switching tabs/episodes back and forth): one request. */
const cache = new Map<string, Promise<Status>>();

function check(url: string) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : { available: null }))
      .then((body: { available?: boolean | null }) =>
        body.available === true ? "available" : body.available === false ? "unavailable" : "unknown",
      )
      .catch(() => "unknown" as const);
    // Don't keep "unknown" (network hiccup): ask again next time.
    void pending.then((status) => status === "unknown" && cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Silent background check: is this movie / episode on Frembed (the default FR
 * player)? Only runs while `enabled` (a Frembed server is selected).
 */
export function useFrembedAvailability({
  kind,
  mediaId,
  imdbId,
  season,
  episode,
  enabled,
}: {
  kind: PlayerKind;
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  enabled: boolean;
}): Status {
  const params = new URLSearchParams({ kind, id: mediaId });
  if (imdbId) params.set("imdb", imdbId);
  if (kind !== "movie") {
    params.set("s", String(season ?? 1));
    params.set("e", String(episode ?? 1));
  }
  const url = `/api/player/availability?${params}`;
  const [result, setResult] = useState<{ url: string; status: Status } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void check(url).then((status) => {
      if (active) setResult({ url, status });
    });
    return () => {
      active = false;
    };
  }, [url, enabled]);

  if (!enabled) return "unknown";
  return result?.url === url ? result.status : "checking";
}
