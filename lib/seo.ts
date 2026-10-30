import "server-only";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

/**
 * Metadata for a title page: link preview image (/api/og/…), Open Graph and
 * X cards. `index: false` for the player pages (only info, trailer and series
 * pages are proposed to search engines).
 */
export async function titleMetadata({
  kind,
  id,
  title,
  description,
  index,
}: {
  kind: "movie" | "tv" | "kdrama" | "anime";
  id: string | number;
  title: string;
  description?: string | null;
  index: boolean;
}): Promise<Metadata> {
  const locale = await getLocale();
  const image = `/api/og/${kind}/${id}?lang=${locale.startsWith("fr") ? "fr" : "en"}`;
  const desc = description?.trim().slice(0, 200) || undefined;
  return {
    title,
    description: desc?.slice(0, 160),
    openGraph: {
      title,
      description: desc,
      siteName: "LuminaFlix",
      type: kind === "movie" ? "video.movie" : "video.tv_show",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [image] },
    robots: index ? undefined : { index: false, follow: true },
  };
}
