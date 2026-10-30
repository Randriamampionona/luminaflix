/**
 * Curated collections & franchises (/collections). Sources:
 *  - "collection": a TMDB collection (a franchise, in release order)
 *  - "company":    every movie of a studio, oldest first ("in order")
 *  - "discover":   a TMDB discover query (e.g. best K-dramas of the year)
 * Any TMDB collection also has a page at /collections/c-<id> (e.g. from search).
 */
type Localized = { en: string; fr: string };

type Source =
  | { type: "collection"; id: number }
  | { type: "company"; id: number; sort: string }
  | { type: "discover"; media: "movie" | "tv"; params: Record<string, string | number> };

export interface CollectionDef {
  slug: string;
  emoji: string;
  title: Localized;
  tagline: Localized;
  /** Words that bring this collection up in search. */
  aliases: string[];
  source: Source;
}

const YEAR = new Date().getFullYear();

export const COLLECTIONS: CollectionDef[] = [
  {
    slug: "marvel-in-order",
    emoji: "🦸",
    title: { en: "All Marvel in order", fr: "Tout Marvel dans l'ordre" },
    tagline: { en: "Every Marvel Studios movie, from the first to the latest.", fr: "Tous les films Marvel Studios, du premier au dernier." },
    aliases: ["marvel", "avengers", "mcu", "iron man", "spider-man", "spiderman", "thor", "captain america"],
    source: { type: "company", id: 420, sort: "primary_release_date.asc" },
  },
  {
    slug: "studio-ghibli",
    emoji: "🍃",
    title: { en: "Studio Ghibli", fr: "Studio Ghibli" },
    tagline: { en: "Miyazaki, Takahata and the magic of Ghibli.", fr: "Miyazaki, Takahata et la magie Ghibli." },
    aliases: ["ghibli", "miyazaki", "totoro", "chihiro", "spirited away"],
    source: { type: "company", id: 10342, sort: "primary_release_date.asc" },
  },
  {
    slug: `best-kdramas-${YEAR}`,
    emoji: "💜",
    title: { en: `Best K-dramas ${YEAR}`, fr: `Meilleurs K-dramas ${YEAR}` },
    tagline: { en: "The Korean series everyone is watching this year.", fr: "Les séries coréennes que tout le monde regarde cette année." },
    aliases: ["kdrama", "k-drama", "korean", "coréen", "coreen", "drama"],
    source: {
      type: "discover",
      media: "tv",
      params: { with_origin_country: "KR", first_air_date_year: YEAR, sort_by: "popularity.desc", "vote_count.gte": 5 },
    },
  },
  {
    slug: `best-anime-${YEAR}`,
    emoji: "🌸",
    title: { en: `Best anime ${YEAR}`, fr: `Meilleurs animes ${YEAR}` },
    tagline: { en: "This year's most popular Japanese anime.", fr: "Les animes japonais les plus populaires de l'année." },
    aliases: ["anime", "animé", "manga", "japan", "japon"],
    source: {
      type: "discover",
      media: "tv",
      params: { with_genres: 16, with_origin_country: "JP", first_air_date_year: YEAR, sort_by: "popularity.desc" },
    },
  },
  {
    slug: "harry-potter",
    emoji: "⚡",
    title: { en: "Harry Potter", fr: "Harry Potter" },
    tagline: { en: "The Wizarding World, in order.", fr: "Le monde des sorciers, dans l'ordre." },
    aliases: ["harry potter", "potter", "poudlard", "hogwarts"],
    source: { type: "collection", id: 1241 },
  },
  {
    slug: "star-wars",
    emoji: "🌌",
    title: { en: "Star Wars saga", fr: "La saga Star Wars" },
    tagline: { en: "A long time ago in a galaxy far, far away…", fr: "Il y a bien longtemps, dans une galaxie lointaine…" },
    aliases: ["star wars", "jedi", "skywalker", "guerre des étoiles"],
    source: { type: "collection", id: 10 },
  },
  {
    slug: "pixar",
    emoji: "💡",
    title: { en: "Pixar, in order", fr: "Pixar, dans l'ordre" },
    tagline: { en: "From Toy Story to today.", fr: "De Toy Story à aujourd'hui." },
    aliases: ["pixar", "toy story", "cars", "nemo"],
    source: { type: "company", id: 3, sort: "primary_release_date.asc" },
  },
  {
    slug: "fast-and-furious",
    emoji: "🏎️",
    title: { en: "Fast & Furious", fr: "Fast & Furious" },
    tagline: { en: "Family, cars and impossible stunts.", fr: "La famille, des voitures et des cascades impossibles." },
    aliases: ["fast", "furious", "fast and furious", "toretto"],
    source: { type: "collection", id: 9485 },
  },
  {
    slug: "lord-of-the-rings",
    emoji: "💍",
    title: { en: "The Lord of the Rings", fr: "Le Seigneur des anneaux" },
    tagline: { en: "One ring to rule them all.", fr: "Un anneau pour les gouverner tous." },
    aliases: ["lord of the rings", "seigneur des anneaux", "frodo", "gandalf"],
    source: { type: "collection", id: 119 },
  },
  {
    slug: "john-wick",
    emoji: "🐶",
    title: { en: "John Wick", fr: "John Wick" },
    tagline: { en: "Don't touch his dog.", fr: "Ne touchez pas à son chien." },
    aliases: ["john wick", "keanu"],
    source: { type: "collection", id: 404609 },
  },
  {
    slug: "mission-impossible",
    emoji: "🕶️",
    title: { en: "Mission: Impossible", fr: "Mission : Impossible" },
    tagline: { en: "Ethan Hunt's every mission.", fr: "Toutes les missions d'Ethan Hunt." },
    aliases: ["mission impossible", "ethan hunt", "tom cruise"],
    source: { type: "collection", id: 87359 },
  },
  {
    slug: "christmas-movies",
    emoji: "🎄",
    title: { en: "Christmas movies", fr: "Films de Noël" },
    tagline: { en: "Cosy films for the holidays.", fr: "Des films douillets pour les fêtes." },
    aliases: ["christmas", "noël", "noel", "xmas"],
    source: { type: "discover", media: "movie", params: { with_keywords: 207317, sort_by: "popularity.desc" } },
  },
];

export const findCollection = (slug: string) => COLLECTIONS.find((c) => c.slug === slug);

/** Curated collections matching a search query. */
export function matchCollections(query: string) {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return [];
  return COLLECTIONS.filter((c) => c.aliases.some((a) => q.includes(a) || a.includes(q)));
}

export const loc = (text: Localized, locale: string) => (locale.startsWith("fr") ? text.fr : text.en);
