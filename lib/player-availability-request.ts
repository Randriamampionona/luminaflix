import type { FrKind } from "@/lib/fr-availability";

/** Headers of the availability routes: never stored (browser, Netlify CDN, proxies). */
export const NO_STORE = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
};

/** ?kind=movie|anime|drama|tv&id=<tmdb>&imdb=<tt…>&s=<season>&e=<episode> → checked values, or null. */
export function readAvailabilityParams(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as FrKind;
  const id = params.get("id") ?? "";
  const imdb = params.get("imdb") ?? "";
  const season = Number(params.get("s") || 1);
  const episode = Number(params.get("e") || 1);
  if (!["movie", "anime", "drama", "tv"].includes(kind) || !/^\d{1,9}$/.test(id)) return null;
  if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) return null;
  return { kind, id, imdb, season, episode };
}
