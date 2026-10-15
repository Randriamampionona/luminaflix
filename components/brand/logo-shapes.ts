/**
 * LuminaFlix mark (white + cyan "L"), as vector polygons in a 384×384 box.
 * Single source for the animated logo, the boot splash and the app icons
 * (scripts/generate-icons.mjs), so every size is pixel-sharp.
 */
export const LOGO_VIEWBOX = "0 0 384 384";

export const LOGO_PIECES = [
  { points: "98,132 134,115 134,252 98,268", color: "white" },
  { points: "140,106 177,88 177,216 140,234", color: "cyan" },
  { points: "181,208 282,248 274,268 177,232", color: "cyan" },
  { points: "141,242 238,284 230,304 136,264", color: "white" },
] as const;

export const LOGO_COLORS = { white: "#f4f4f5", cyan: "#00e5f0", background: "#111114" } as const;
