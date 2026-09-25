/**
 * Central i18n configuration.
 *
 * The UI locale also drives the TMDB `language` parameter, so titles,
 * overviews and genre names follow the language the user picked. The locale
 * is persisted in the `NEXT_LOCALE` cookie, which the server reads on every
 * request — the first paint is already translated, with no URL parameter.
 */
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const localeMeta: Record<
  Locale,
  { nativeName: string; short: string; tmdb: string; og: string }
> = {
  en: { nativeName: "English", short: "EN", tmdb: "en-US", og: "en_US" },
  fr: { nativeName: "Français", short: "FR", tmdb: "fr-FR", og: "fr_FR" },
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** Maps the legacy `?display_lang=fr-FR` query param to a locale. */
export function localeFromLegacyParam(value?: string | null): Locale | null {
  if (!value) return null;
  const base = value.toLowerCase().split("-")[0];
  return isLocale(base) ? base : null;
}

/** Picks the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const match = ranked.find((entry) => isLocale(entry.base));
  return match && isLocale(match.base) ? match.base : defaultLocale;
}
