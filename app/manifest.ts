import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest). Makes LuminaFlix
 * installable on Android, desktop Chrome/Edge and iPhone/iPad ("Add to Home
 * Screen" — also required there for push notifications).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LuminaFlix",
    short_name: "LuminaFlix",
    description: "Movies, series, anime and K-dramas in one place.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#020202",
    theme_color: "#020202",
    categories: ["entertainment", "video"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // Vector icon: perfectly sharp on every screen density where supported.
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Long-press the app icon (Android / desktop) to jump straight to a section.
    shortcuts: [
      {
        name: "Movies",
        short_name: "Movies",
        url: "/movies?source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "K-Drama",
        short_name: "K-Drama",
        url: "/k-drama?source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Anime",
        short_name: "Anime",
        url: "/anime?source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "My favorites",
        short_name: "Favorites",
        url: "/favorites?source=pwa",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
