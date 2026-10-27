/**
 * CSS pipeline:
 * 1. Tailwind CSS v4.
 * 2. postcss-preset-env — compiles modern CSS for the browsers listed in
 *    package.json "browserslist" (incl. Smart TVs: Tizen, webOS, Android TV):
 *    cascade layers (@layer is unknown to Chromium < 99 and would drop ALL
 *    utilities), logical properties (padding-inline…), nesting, media ranges,
 *    and vendor prefixes via autoprefixer.
 * 3. ./postcss/legacy-tv.cjs — remaining fallbacks (inset, dvh, translate/scale,
 *    :where/:is, aspect-ratio, @property defaults, grid-gap).
 * Modern browsers render exactly as before (fallbacks come first or sit in
 * `@supports not (…)` blocks they skip).
 */
import path from "node:path";

// Local plugin, by absolute path (Turbopack resolves plugin names like packages).
const legacyTv = path.join(process.cwd(), "postcss", "legacy-tv.cjs");

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "postcss-preset-env": {
      stage: 2,
      features: {
        "cascade-layers": true,
        "logical-properties-and-values": true,
        "nesting-rules": true,
        "media-query-ranges": true,
        // Tailwind already ships colour fallbacks; keep variables as they are.
        "custom-properties": false,
        "color-mix-function": false,
        // :is()/:where() are handled by ./postcss/legacy-tv.cjs without touching the originals.
        "is-pseudo-class": false,
      },
      autoprefixer: { flexbox: "no-2009", grid: false },
    },
    [legacyTv]: {},
  },
};

export default config;
