import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

const DOMAIN = SITE_URL;

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
