/**
 * LuminaFlix short links (https://lumina-flix.vercel.app/Ab3xK9q) — shared types.
 * Server side: lib/short-links-server.ts · action: action/short-links.action.ts ·
 * redirect: proxy.ts → app/api/s/[code]/route.ts · stats: /analytics.
 */

/** 7 characters, letters + digits, at least one digit (never equal to a page name like "privacy"). */
export const SHORT_CODE_RE = /^(?=[A-Za-z]*\d)[A-Za-z0-9]{7}$/;

/** What a short link points to (shown in the stats). */
export type ShortLinkKind = "page" | "trailer" | "poster" | "series";

export type ShortLinkCodes = Partial<Record<ShortLinkKind, string>>;
