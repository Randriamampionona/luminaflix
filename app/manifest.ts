import type { MetadataRoute } from "next";

/**
 * Web app manifest. Lets people install LuminaFlix ("Add to Home Screen"),
 * which is also what enables push notifications on iPhone / iPad (iOS 16.4+).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LuminaFlix",
    short_name: "LuminaFlix",
    description: "Movies, series, anime and K-dramas in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020202",
    theme_color: "#06b6d4",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
