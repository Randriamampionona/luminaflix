"use client";

import { useSyncExternalStore } from "react";

/**
 * Visitor preferences kept in this browser (menu → Preferences):
 *  - frOnly:    listings only show titles available in VF / VOSTFR
 *  - dataSaver: smaller images, no trailer previews, no decorations (mobile data)
 * Data saver defaults to on when the device asks to save data (Android "Lite mode").
 */
export type Pref = "frOnly" | "dataSaver";

const KEYS: Record<Pref, string> = { frOnly: "lf_fr_only", dataSaver: "lf_data_saver" };
const listeners = new Set<() => void>();

function deviceSavesData() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!connection?.saveData;
}

export function getPref(pref: Pref): boolean {
  try {
    const value = localStorage.getItem(KEYS[pref]);
    if (value === null) return pref === "dataSaver" ? deviceSavesData() : false;
    return value === "1";
  } catch {
    return false;
  }
}

/** Applies data saver to the page (class used by CSS + the image loader). */
function applyPrefs() {
  const saver = getPref("dataSaver");
  document.documentElement.classList.toggle("data-saver", saver);
  (window as Window & { __lfDataSaver?: boolean }).__lfDataSaver = saver;
}

export function setPref(pref: Pref, value: boolean) {
  try {
    localStorage.setItem(KEYS[pref], value ? "1" : "0");
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  applyPrefs();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function usePref(pref: Pref) {
  return useSyncExternalStore(
    subscribe,
    () => getPref(pref),
    () => false,
  );
}

/** Runs before the page paints (see components/prefs/prefs-script.tsx). */
export const PREFS_BOOT_SCRIPT = `try{var s=localStorage.getItem("lf_data_saver");var c=navigator.connection;if(s==="1"||(s===null&&c&&c.saveData)){document.documentElement.classList.add("data-saver");window.__lfDataSaver=true}}catch(e){}`;
