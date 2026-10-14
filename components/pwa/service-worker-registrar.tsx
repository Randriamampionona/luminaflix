"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/service-worker";

/** Registers the service worker once the page has loaded (offline support + push). */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      registerServiceWorker().catch((error) => console.warn("[pwa] service worker registration failed", error));
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
