/**
 * The site's public address, without a trailing slash (NEXT_PUBLIC_DOMAIN,
 * e.g. https://www.lumina-flix.live). Used for absolute links: sitemap,
 * robots.txt, e-mails, push notifications.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN || "https://www.lumina-flix.live").replace(/\/+$/, "");
