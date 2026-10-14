"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Install state for the PWA.
 *
 * `beforeinstallprompt` (Chrome, Edge, Samsung Internet, Android) can fire
 * before React has hydrated, so a tiny inline script in app/layout.tsx
 * (PWA_CAPTURE_SCRIPT) catches it early, stores it on `window.__lfInstallPrompt`
 * and dispatches "lf:pwa". This hook just reads that store.
 *
 * The event never fires on iPhone / iPad / Safari, and Chrome only fires it
 * after the visitor has interacted with the page for a while (engagement
 * heuristic), so `platform` lets the UI show step-by-step instructions until
 * the one-tap install becomes available.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __lfInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const INSTALLED_KEY = "lf_pwa_installed";
const EVENT = "lf:pwa";

/** Inline script for <head>: capture the install prompt before hydration. */
export const PWA_CAPTURE_SCRIPT = `
window.__lfInstallPrompt = null;
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  window.__lfInstallPrompt = e;
  window.dispatchEvent(new Event("${EVENT}"));
});
window.addEventListener("appinstalled", function () {
  window.__lfInstallPrompt = null;
  try { localStorage.setItem("${INSTALLED_KEY}", "1"); } catch (_) {}
  window.dispatchEvent(new Event("${EVENT}"));
});`;

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  window.addEventListener(EVENT, onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

const getPrompt = () => window.__lfInstallPrompt ?? null;
const getStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const getInstalledFlag = () => {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
};
/**
 * How this browser installs web apps when there is no one-tap install event yet:
 * - "ios": Share → Add to Home Screen (all iPhone / iPad browsers)
 * - "android": browser menu → Install app / Add to Home screen
 * - "desktop": Chrome / Edge / Opera / Brave install icon in the address bar
 * - "mac-safari": File → Add to Dock (Safari 17+)
 * - "unsupported": desktop Firefox and others (no way to install)
 */
export type InstallPlatform = "ios" | "android" | "desktop" | "mac-safari" | "unsupported";

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch.
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/firefox|fxios/i.test(ua)) return "unsupported";
  if (/edg\/|chrome|crios|opr\//i.test(ua)) return "desktop";
  if (/macintosh/i.test(ua) && /safari/i.test(ua)) return "mac-safari";
  return "unsupported";
}

export function usePWAInstall() {
  const deferredPrompt = useSyncExternalStore(subscribe, getPrompt, () => null);
  const isStandalone = useSyncExternalStore(subscribe, getStandalone, () => false);
  const installedFlag = useSyncExternalStore(subscribe, getInstalledFlag, () => false);
  const platform = useSyncExternalStore(subscribe, detectPlatform, () => "unsupported" as InstallPlatform);

  /** Opens the browser's install dialog. Resolves with the user's choice. */
  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const event = window.__lfInstallPrompt;
    if (!event) return "unavailable";
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt event can only be used once.
    window.__lfInstallPrompt = null;
    if (outcome === "accepted") {
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {
        // ignore
      }
    }
    window.dispatchEvent(new Event(EVENT));
    return outcome;
  }, []);

  return {
    /** The browser offered installation (Chrome / Edge / Android). */
    canInstall: deferredPrompt !== null,
    /** Running as the installed app right now. */
    isStandalone,
    /** Installed (now or before) — never ask again. */
    isInstalled: isStandalone || installedFlag,
    /** How to install by hand when `canInstall` is false. */
    platform,
    promptInstall,
  };
}
