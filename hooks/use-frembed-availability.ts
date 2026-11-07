"use client";

import { useEffect, useState } from "react";
import type { PlayerKind } from "@/components/player/providers";
import { readVidzy, VIDZY_BASE, type FrLang, type VidzyResponse } from "@/lib/vidzy";

type Status = "checking" | "available" | "unavailable" | "unknown";

interface FrAvailability {
  status: Status;
  /** French player that has the title: VIDZY first, then Frembed. */
  provider: "vidzy" | "frembed" | null;
  /** Every French language VIDZY has, in its order (one VIDZY server each). */
  langs: FrLang[];
  /** VIDZY link to use for this title instead of the usual one (see lib/fr-availability.ts). */
  embed: string | null;
  /** VIDZY's own answer: true / false, or null when nobody could ask VIDZY (the player still offers it). */
  vidzy: boolean | null;
}

const UNKNOWN: FrAvailability = { status: "unknown", provider: null, langs: [], embed: null, vidzy: null };
const CHECKING: FrAvailability = { status: "checking", provider: null, langs: [], embed: null, vidzy: null };

/**
 * Second chance for VIDZY, from the visitor's browser: when the server
 * couldn't confirm VIDZY (its requests can be slowed or refused by VIDZY while
 * a visitor's are not), the browser asks https://vidzy.org/api/{id} itself.
 * Returns null if the browser can't ask either (network, CORS).
 */
async function askVidzyFromBrowser(kind: PlayerKind, id: string, season: number, episode: number) {
  try {
    const res = await fetch(`${VIDZY_BASE}/api/${id}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (res.status === 404) return readVidzy("not-found", kind === "movie", season, episode);
    if (!res.ok) return null;
    return readVidzy((await res.json()) as VidzyResponse, kind === "movie", season, episode);
  } catch {
    return null;
  }
}

/** Same title asked twice in a visit (switching tabs/episodes back and forth): one request. */
const cache = new Map<string, Promise<FrAvailability>>();

function check(url: string, kind: PlayerKind, id: string, season: number, episode: number) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => (res.ok ? res.json() : { available: null }))
      .then(
        (body: {
          available?: boolean | null;
          provider?: string | null;
          langs?: unknown;
          embed?: unknown;
          vidzy?: boolean | null;
        }): FrAvailability => ({
          status: body.available === true ? "available" : body.available === false ? "unavailable" : "unknown",
          provider: body.provider === "vidzy" || body.provider === "frembed" ? body.provider : null,
          langs: Array.isArray(body.langs) ? body.langs.filter((l): l is FrLang => l === "vf" || l === "vostfr") : [],
          embed: typeof body.embed === "string" && /^https:\/\//.test(body.embed) ? body.embed : null,
          vidzy: body.vidzy === true ? true : body.vidzy === false ? false : body.provider === "vidzy" ? true : null,
        }),
      )
      .catch(() => UNKNOWN)
      .then(async (server): Promise<FrAvailability> => {
        if (server.vidzy === true) return server;
        // VIDZY not confirmed by the server: ask it from the browser.
        const browser = await askVidzyFromBrowser(kind, id, season, episode);
        if (browser?.available) {
          return { status: "available", provider: "vidzy", langs: browser.langs, embed: browser.embed, vidzy: true };
        }
        if (browser && server.vidzy === null) return { ...server, vidzy: false };
        return server;
      });
    // Only "available" is kept for the visit: "unavailable" / "unknown" are asked again next time.
    void pending.then((r) => r.status !== "available" && cache.delete(url));
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
    void check(url, kind, mediaId, season ?? 1, episode ?? 1).then((value) => {
      if (active) setResult({ url, value });
    });
    return () => {
      active = false;
    };
  }, [url, enabled, kind, mediaId, season, episode]);

  if (!enabled) return UNKNOWN;
  return result?.url === url ? result.value : CHECKING;
}
