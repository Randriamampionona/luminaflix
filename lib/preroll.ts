/**
 * Video pre-roll before the players (HilltopAds VAST zone #7634741, IMA version).
 * Played with Google's IMA SDK (free, no AdSense account needed).
 *
 *  - at most 1 ad every 30 min per browser (counted when an ad really starts);
 *  - never for the admin (same flag as the Smartlinks);
 *  - no ad (none available, ad blocker, error, timeout) → the movie starts directly.
 */
const PREROLL_VAST_URL =
  process.env.NEXT_PUBLIC_PREROLL_VAST_URL ||
  "https://nautical-hand.com/d/mhFazId.GcNSvTZJGDUW/keXmT9qutZKUwlbkbPhTBcS2/M/z/Q/3DNxD/E/tONnz/YgzGNADbcR0ONWShZqs/anWx1vpud_Db0/xD";

const IMA_SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
const LAST_KEY = "lf_preroll_last";
const MIN_GAP_MS = 30 * 60_000;
/** Seconds before "Skip ad" can be clicked. */
export const PREROLL_SKIP_AFTER_S = 5;
/** No ad started within this delay → the movie starts. */
export const PREROLL_TIMEOUT_MS = 8000;

/** Should the next Play show an ad? */
export function shouldShowPreroll(): boolean {
  if (!PREROLL_VAST_URL) return false;
  try {
    if (sessionStorage.getItem("lf_is_admin") === "1") return false;
    const last = Number(localStorage.getItem(LAST_KEY)) || 0;
    return Date.now() - last >= MIN_GAP_MS;
  } catch {
    return true;
  }
}

export function markPrerollShown() {
  try {
    localStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/** VAST URL with a fresh cache-buster (IMA tags expect a "correlator"). */
export function prerollTagUrl() {
  const sep = PREROLL_VAST_URL.includes("?") ? "&" : "?";
  return `${PREROLL_VAST_URL}${sep}correlator=${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

// ---------------------------------------------------------------- IMA SDK --
// Minimal typing of the parts of google.ima used here.
export interface ImaAdsManager {
  init(width: number, height: number, viewMode: unknown): void;
  start(): void;
  resize(width: number, height: number, viewMode: unknown): void;
  getRemainingTime(): number;
  destroy(): void;
  addEventListener(type: unknown, listener: (event: { getAd?: () => unknown }) => void, capture?: boolean): void;
}
interface ImaEventTarget {
  addEventListener(type: unknown, listener: (event: never) => void, capture?: boolean): void;
  destroy(): void;
}
interface Ima {
  AdDisplayContainer: new (container: HTMLElement) => { initialize(): void; destroy(): void };
  AdsLoader: new (container: unknown) => ImaEventTarget & { requestAds(request: unknown): void };
  AdsRequest: new () => {
    adTagUrl: string;
    linearAdSlotWidth: number;
    linearAdSlotHeight: number;
    nonLinearAdSlotWidth: number;
    nonLinearAdSlotHeight: number;
    vastLoadTimeout: number;
    setAdWillAutoPlay(value: boolean): void;
    setAdWillPlayMuted(value: boolean): void;
  };
  AdsRenderingSettings: new () => { restoreCustomPlaybackStateOnAdBreakComplete: boolean };
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: unknown } };
  AdErrorEvent: { Type: { AD_ERROR: unknown } };
  AdEvent: {
    Type: {
      STARTED: unknown;
      COMPLETE: unknown;
      ALL_ADS_COMPLETED: unknown;
      SKIPPED: unknown;
      USER_CLOSE: unknown;
      CONTENT_RESUME_REQUESTED: unknown;
    };
  };
  ViewMode: { NORMAL: unknown; FULLSCREEN: unknown };
}

declare global {
  interface Window {
    google?: { ima?: Ima };
  }
}

let loading: Promise<Ima | null> | null = null;

/** Loads Google's IMA SDK once (null if it can't load, e.g. an ad blocker). */
export function loadIma(): Promise<Ima | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.ima) return Promise.resolve(window.google.ima);
  loading ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => resolve(window.google?.ima ?? null);
    script.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}
