/** Single source of truth for navigation (navbar, mobile sheet, footer). */
export const NAV_ITEMS = [
  { key: "movies", href: "/movies" },
  { key: "newPopular", href: "/new-popular" },
  { key: "kdrama", href: "/k-drama" },
  { key: "library", href: "/library" },
  { key: "genres", href: "/genres" },
  { key: "anime", href: "/anime" },
  { key: "tvShows", href: "/tv-shows" },
  { key: "favorites", href: "/favorites" },
] as const;

export type NavKey = (typeof NAV_ITEMS)[number]["key"];

/** Number of items shown inline on desktop; the rest go under "More". */
export const NAV_INLINE_COUNT = 3;

export const FOOTER_SECTIONS = [
  {
    key: "navigation",
    links: [
      { key: "home", href: "/" },
      { key: "movies", href: "/movies" },
      { key: "tvShows", href: "/tv-shows" },
      { key: "library", href: "/library" },
      { key: "newPopular", href: "/new-popular" },
    ],
  },
  {
    key: "support",
    links: [
      { key: "help", href: "/help" },
      { key: "faq", href: "/help#faq" },
      { key: "contact", href: "/contact" },
      { key: "terms", href: "/terms" },
      { key: "privacy", href: "/privacy" },
    ],
  },
  {
    key: "premium",
    links: [
      { key: "plus", href: "/premium" },
      { key: "plans", href: "/premium#plans" },
      { key: "devices", href: "/help#devices" },
    ],
  },
] as const;

/**
 * Social profiles. Entries without an href are not rendered — the previous
 * footer pointed every icon at "#".
 */
export const SOCIAL_LINKS: { key: "facebook" | "twitter" | "instagram" | "youtube" | "github"; href?: string }[] = [
  { key: "facebook" },
  { key: "twitter" },
  { key: "instagram" },
  { key: "youtube" },
  { key: "github" },
];
