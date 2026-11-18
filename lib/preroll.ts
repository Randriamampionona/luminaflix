/**
 * Video pre-roll before the players (HilltopAds VAST zone #7634741, IMA version).
 * Played with Google's IMA SDK (free, no AdSense account needed).
 *
 *  - at most 1 ad every 30 min per browser (counted when an ad really starts);
 *  - never for the admin (same flag as the Smartlinks) — except in test mode;
 *  - no ad (none available, ad blocker, error, timeout) → the movie starts directly.
 *
 * Test mode: add `?preroll=test` to a player page URL → an ad is requested on
 * every Play (admin included, 30-min limit ignored), and every step is logged
 * in the browser console with the "[preroll]" prefix.
 */
const PREROLL_VAST_URL =
  process.env.NEXT_PUBLIC_PREROLL_VAST_URL ||
  "https://nautical-hand.com/d/mhFazId.GcNSvTZJGDUW/keXmT9qutZKUwlbkbPhTBcS2/M/z/Q/3DNxD/E/tONnz/YgzGNADbcR0ONWShZqs/anWx1vpud_Db0/xD";

const IMA_SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
const LAST_KEY = "lf_preroll_last";
const MIN_GAP_MS = 30 * 60_000;
/** Seconds before "Skip ad" can be clicked. */
export const PREROLL_SKIP_AFTER_S = 5;
/** No ad started within this delay (SDK + VAST chain + first frame) → the movie starts. */
export const PREROLL_TIMEOUT_MS = 12000;
/** Max time IMA waits for the VAST response (wrappers included). */
export const PREROLL_VAST_TIMEOUT_MS = 10000;

const isTestMode = () => {
  try {
    return new URLSearchParams(window.location.search).get("preroll") === "test";
  } catch {
    return false;
  }
};

/** "[preroll]" logs in the browser console (to see why an ad did or didn't show). */
export const prerollLog = (...args: unknown[]) => console.info("[preroll]", ...args);

/** Should the next Play show an ad? */
export function shouldShowPreroll(log = true): boolean {
  if (!PREROLL_VAST_URL) return false;
  if (isTestMode()) return true;
  try {
    if (sessionStorage.getItem("lf_is_admin") === "1") {
      if (log) prerollLog("no ad: admin account (add ?preroll=test to the URL to test)");
      return false;
    }
    const last = Number(localStorage.getItem(LAST_KEY)) || 0;
    const wait = MIN_GAP_MS - (Date.now() - last);
    if (wait > 0) {
      if (log) prerollLog(`no ad: one was shown less than 30 min ago (next in ${Math.ceil(wait / 60000)} min)`);
      return false;
    }
    return true;
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

/** The VAST tag exactly as HilltopAds gives it (no extra parameter: their links are encoded). */
export const prerollTagUrl = () => PREROLL_VAST_URL;

// ---------------------------------------------------------------- IMA SDK --
// Minimal typing of the parts of google.ima used here.
export interface ImaAdsManager {
  init(width: number, height: number, viewMode: unknown): void;
  start(): void;
  resize(width: number, height: number, viewMode: unknown): void;
  getRemainingTime(): number;
  setVolume(volume: number): void;
  destroy(): void;
  addEventListener(
    type: unknown,
    listener: (event: { getAd?: () => unknown; getError?: () => unknown }) => void,
    capture?: boolean,
  ): void;
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
/** The IMA objects prepared in the Play click (needed for sound / autoplay on phones). */
export interface PreparedAdDisplay {
  ima: Ima;
  container: { initialize(): void; destroy(): void };
}

/**
 * Called synchronously in the Play click: creates and initializes IMA's display
 * container in the user gesture, as the IMA docs require (otherwise browsers —
 * iOS Safari above all — block the ad's video). Null if the SDK isn't loaded yet.
 */
export function prepareAdDisplay(slot: HTMLElement | null): PreparedAdDisplay | null {
  const ima = typeof window !== "undefined" ? window.google?.ima : undefined;
  if (!ima || !slot) return null;
  try {
    const container = new ima.AdDisplayContainer(slot);
    container.initialize();
    return { ima, container };
  } catch (error) {
    prerollLog("could not prepare the ad display", error);
    return null;
  }
}

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
      prerollLog("no ad: Google IMA SDK blocked or unreachable (ad blocker?)");
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}
