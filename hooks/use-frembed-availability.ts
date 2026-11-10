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
  /** Frembed's API answers (by TMDB id; and by IMDb id for movies). Each Frembed server only when true. */
  frembed: boolean | null;
  frembedImdb: boolean | null;
}

const NONE = { vidzy: null, frembed: null, frembedImdb: null };
const UNKNOWN: FrAvailability = { status: "unknown", provider: null, langs: [], ...NONE };
const CHECKING: FrAvailability = { status: "checking", provider: null, langs: [], ...NONE };
const bool = (v: unknown) => (v === true ? true : v === false ? false : null);

/** One live request every time a player shows a title (no cache, nothing shared or kept). */
function check(url: string): Promise<FrAvailability> {
  return fetch(`${url}&_=${Date.now()}`, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : { available: null }))
    .then(
      (body: {
        available?: boolean | null;
        provider?: string | null;
        langs?: unknown;
        vidzy?: unknown;
        frembed?: unknown;
        frembedImdb?: unknown;
      }): FrAvailability => ({
        status: body.available === true ? "available" : body.available === false ? "unavailable" : "unknown",
        provider: body.provider === "vidzy" || body.provider === "frembed" ? body.provider : null,
        langs: Array.isArray(body.langs) ? body.langs.filter((l): l is FrLang => l === "vf" || l === "vostfr") : [],
        vidzy: bool(body.vidzy),
        frembed: bool(body.frembed),
        frembedImdb: bool(body.frembedImdb),
      }),
    )
    .catch(() => UNKNOWN);
}

/**
 * Checks which French player has this movie / episode
 * (app/api/player/availability → VIDZY's and Frembed's official APIs).
 */
export function useFrembedAvailability({
  kind,
  mediaId,
  imdbId,
  season,
  episode,
  enabled,
  round = 0,
}: {
  kind: PlayerKind;
  mediaId: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  enabled: boolean;
  /** Changing it asks the APIs again (fresh check). */
  round?: number;
}): FrAvailability {
  const params = new URLSearchParams({ kind, id: mediaId });
  if (imdbId) params.set("imdb", imdbId);
  if (kind !== "movie") {
    params.set("s", String(season ?? 1));
    params.set("e", String(episode ?? 1));
  }
  const url = `/api/player/availability?${params}`;
  const key = `${url}#${round}`;
  const [result, setResult] = useState<{ key: string; value: FrAvailability } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void check(url).then((value) => {
      if (active) setResult({ key, value });
    });
    return () => {
      active = false;
    };
  }, [url, key, enabled]);

  if (!enabled) return UNKNOWN;
  return result?.key === key ? result.value : CHECKING;
}
