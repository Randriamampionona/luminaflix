import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Push service worker: always fetch the latest version.
  async headers() {
    return [
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
