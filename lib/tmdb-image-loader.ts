import type { ImageLoaderProps } from "next/image";

/**
 * TMDB size buckets. Anything wider than the largest bucket is capped at
 * w1280: `original` files are often 4K / several MB, which was the main
 * cause of the slow hero and details pages.
 */
const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const;
const TMDB_PATTERN = /^https:\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/.+)$/;

export default function tmdbImageLoader({ src, width }: ImageLoaderProps) {
  const match = src.match(TMDB_PATTERN);
  if (match) {
    const bucket =
      TMDB_WIDTHS.find((size) => size >= width) ??
      TMDB_WIDTHS[TMDB_WIDTHS.length - 1];
    return `https://image.tmdb.org/t/p/w${bucket}${match[1]}`;
  }
  // Non-TMDB sources are served as-is; the width hint keeps srcset entries
  // unique and satisfies Next's loader contract.
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}w=${width}`;
}
