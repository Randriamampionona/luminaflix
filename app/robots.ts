import type { MetadataRoute } from "next";

const DOMAIN = (process.env.NEXT_PUBLIC_DOMAIN || "https://lumina-flix.vercel.app").replace(/\/+$/, "");

/** Search engines: info, trailer, series and collection pages; never the private/admin areas. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/analytics", "/media-infos", "/bot-filter", "/sign-in", "/sign-up", "/offline", "/launch", "/favorites"],
    },
    sitemap: `${DOMAIN}/sitemap.xml`,
  };
}
