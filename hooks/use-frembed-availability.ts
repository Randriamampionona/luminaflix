"use client";

import { useEffect, useState } from "react";
import type { PlayerKind } from "@/components/player/providers";

type Status = "checking" | "available" | "unavailable" | "unknown";
type FrLang = "vf" | "vostfr";

interface FrAvailability {
  status: Status;
  /** French player that has the title: VIDZY first, then Frembed. */
  provider: "vidzy" | "frembed" | null;
  /** Every French language VIDZY has, in its order (one VIDZY server each). */
  langs: FrLang[];
  /** VIDZY link to use for this title instead of the usual one (see lib/fr-availability.ts). */
  embed: string | null;
}

const UNKNOWN: FrAvailability = { status: "unknown", provider: null, langs: [], embed: null };
const CHECKING: FrAvailability = { status: "checking", provider: null, langs: [], embed: null };

/** Same title asked twice in a visit (switching tabs/episodes back and forth): one request. */
const cache = new Map<string, Promise<FrAvailability>>();

function check(url: string) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : { available: null }))
      .then((body: { available?: boolean | null; provider?: string | null; langs?: unknown; embed?: unknown }) => ({
        status: body.available === true ? "available" : body.available === false ? "unavailable" : "unknown",
        provider: body.provider === "vidzy" || body.provider === "frembed" ? body.provider : null,
        langs: Array.isArray(body.langs) ? body.langs.filter((l): l is FrLang => l === "vf" || l === "vostfr") : [],
        embed: typeof body.embed === "string" && /^https:\/\//.test(body.embed) ? body.embed : null,
      }))
      .catch(() => UNKNOWN) as Promise<FrAvailability>;
    // Don't keep "unknown" (network hiccup): ask again next time.
    void pending.then((r) => r.status === "unknown" && cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Silent background check of the French players (app/api/player/availability):
 * which one has this movie / episode (VIDZY, then Frembed), in which language,
 * or none. Only runs while `enabled` (the French tab is selected).
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
