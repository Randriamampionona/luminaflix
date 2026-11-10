"use client";

import { useEffect, useState } from "react";
import type { PlayerKind } from "@/components/player/providers";

type Status = "checking" | "available" | "unavailable" | "unknown";
type FrLang = "vf" | "vostfr";

interface FrAvailability {
  status: Status;
  /** French player that has the title: VIDZY first, then Frembed. */
  provider: "vidzy" | "frembed" | null;
  /** VIDZY languages (only when VIDZY's API confirmed it has the title). */
  langs: FrLang[];
  /** VIDZY's API answer: true / false, or null when it gave no valid answer. VIDZY is offered only when true. */
  vidzy: boolean | null;
}

const UNKNOWN: FrAvailability = { status: "unknown", provider: null, langs: [], vidzy: null };
const CHECKING: FrAvailability = { status: "checking", provider: null, langs: [], vidzy: null };

/** One check per player page and visit (complete answers only; others are asked again next time). */
const cache = new Map<string, Promise<FrAvailability>>();

function check(url: string) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : { available: null }))
      .then(
        (body: { available?: boolean | null; provider?: string | null; langs?: unknown; vidzy?: boolean | null }) => ({
          status: body.available === true ? "available" : body.available === false ? "unavailable" : "unknown",
          provider: body.provider === "vidzy" || body.provider === "frembed" ? body.provider : null,
          langs: Array.isArray(body.langs) ? body.langs.filter((l): l is FrLang => l === "vf" || l === "vostfr") : [],
          vidzy: body.vidzy === true ? true : body.vidzy === false ? false : null,
        }),
      )
      .catch(() => UNKNOWN) as Promise<FrAvailability>;
    void pending.then((r) => (r.status !== "available" || r.vidzy === null) && cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Checks which French player has this movie / episode
 * (app/api/player/availability → VIDZY's official API, then Frembed).
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
}): FrAvailability {
  const params = new URLSearchParams({ kind, id: mediaId });
  if (imdbId) params.set("imdb", imdbId);
  if (kind !== "movie") {
    params.set("s", String(season ?? 1));
    params.set("e", String(episode ?? 1));
  }
  const url = `/api/player/availability?${params}`;
  const [result, setResult] = useState<{ url: string; value: FrAvailability } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void check(url).then((value) => {
      if (active) setResult({ url, value });
    });
    return () => {
      active = false;
    };
  }, [url, enabled]);

  if (!enabled) return UNKNOWN;
  return result?.url === url ? result.value : CHECKING;
}
