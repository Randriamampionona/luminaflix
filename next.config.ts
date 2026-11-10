import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** This build's id (Netlify commit / deploy) — the app reloads itself when a newer one is live. */
const BUILD_ID = process.env.COMMIT_REF || process.env.DEPLOY_ID || process.env.VERCEL_GIT_COMMIT_SHA || `${Date.now()}`;

/** Player pages: never stored by the browser, Netlify's CDN or any proxy. */
const NO_STORE = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Netlify-CDN-Cache-Control", value: "no-store" },
];
const PLAYER_PAGES = ["/movies/:id", "/k-drama/play/:id", "/tv-shows/play/:id", "/anime/play/:id"];

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // Push service worker: always fetch the latest version.
  async headers() {
    return [
      ...PLAYER_PAGES.map((source) => ({ source, headers: NO_STORE })),
      {
        source: "/firebase-messaging-sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  images: {
    // PERF: TMDB already serves pre-sized renditions from its CDN. The custom
    // loader maps each srcset width to the closest TMDB size bucket, so we get
    // responsive images without paying for (or waiting on) re-optimization.
    loader: "custom",
    loaderFile: "./lib/tmdb-image-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
