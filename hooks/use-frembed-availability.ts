"use client";

import { useEffect, useState } from "react";
import type { PlayerKind } from "@/components/player/providers";

type Status = "checking" | "available" | "unavailable" | "unknown";
type FrLang = "vf" | "vostfr";

interface FrAvailability {
  /**
   * checking → VIDZY hasn't answered yet, or VIDZY didn't confirm and Frembed hasn't answered yet;
   * available → VIDZY or Frembed confirmed; unavailable → both APIs answered "no";
   * unknown → no confirmation and at least one API gave no valid answer in time.
   */
  status: Status;
  /** French player that has the title: VIDZY first, then Frembed. */
  provider: "vidzy" | "frembed" | null;
  /** VIDZY languages (only when VIDZY's API confirmed it has the title). */
  langs: FrLang[];
  /** VIDZY's API answer: true / false, or null (no valid answer / not answered yet). */
  vidzy: boolean | null;
  /** Frembed's API answers (by TMDB id; and by IMDb id for movies). Each Frembed server only when true. */
  frembed: boolean | null;
  frembedImdb: boolean | null;
  /** Frembed still being asked (its servers wait, greyed out). */
  frembedPending: boolean;
}

interface VidzyPart {
  vidzy: boolean | null;
  langs: FrLang[];
}
interface FrembedPart {
  frembed: boolean | null;
  frembedImdb: boolean | null;
}

const bool = (v: unknown) => (v === true ? true : v === false ? false : null);
const OFF: FrAvailability = {
  status: "unknown",
  provider: null,
  langs: [],
  vidzy: null,
  frembed: null,
  frembedImdb: null,
  frembedPending: false,
};

/** One live request (no cache, unique URL). */
async function ask<T>(url: string, read: (body: Record<string, unknown>) => T, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${url}&_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return read((await res.json()) as Record<string, unknown>);
  } catch {
    return fallback;
  }
}

function combine(vidzy: VidzyPart | undefined, frembed: FrembedPart | undefined, isMovie: boolean): FrAvailability {
  const v = vidzy?.vidzy ?? null;
  const f = frembed?.frembed ?? null;
  const fi = isMovie ? (frembed?.frembedImdb ?? null) : false;
  const base = {
    langs: v ? (vidzy?.langs ?? []) : [],
    vidzy: v,
    frembed: f,
    frembedImdb: isMovie ? fi : null,
    frembedPending: !frembed,
  };
  // VIDZY has priority: confirmed → playable right away, without waiting for Frembed.
  if (v === true) return { ...base, status: "available", provider: "vidzy" };
  if (!vidzy || !frembed) return { ...base, status: "checking", provider: null };
  if (f === true || fi === true) return { ...base, status: "available", provider: "frembed" };
  if (v === false && f === false && fi === false) return { ...base, status: "unavailable", provider: null };
  return { ...base, status: "unknown", provider: null };
}

/**
 * Which French player has this movie / episode: VIDZY and Frembed are asked
 * separately and at the same time (app/api/player/availability/vidzy and
 * …/frembed), live, with no cache. VIDZY's answer is used as soon as it
 * arrives; Frembed's servers appear when Frembed has answered.
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
  const query = params.toString();
  const key = `${query}#${round}`;
  const [parts, setParts] = useState<{ key: string; vidzy?: VidzyPart; frembed?: FrembedPart }>({ key: "" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void ask<VidzyPart>(
      `/api/player/availability/vidzy?${query}`,
      (b) => ({
        vidzy: bool(b.vidzy),
        langs: Array.isArray(b.langs) ? b.langs.filter((l): l is FrLang => l === "vf" || l === "vostfr") : [],
      }),
      { vidzy: null, langs: [] },
    ).then((vidzy) => {
      if (active) setParts((prev) => ({ ...(prev.key === key ? prev : { key }), vidzy }));
    });
    void ask<FrembedPart>(
      `/api/player/availability/frembed?${query}`,
      (b) => ({ frembed: bool(b.frembed), frembedImdb: bool(b.frembedImdb) }),
      { frembed: null, frembedImdb: null },
    ).then((frembed) => {
      if (active) setParts((prev) => ({ ...(prev.key === key ? prev : { key }), frembed }));
    });
    return () => {
      active = false;
    };
  }, [query, key, enabled]);

  if (!enabled) return OFF;
  const current = parts.key === key ? parts : { key };
  return combine(current.vidzy, current.frembed, kind === "movie");
}
