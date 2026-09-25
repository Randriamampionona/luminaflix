/**
 * Filter / sort definitions shared by the server actions and the filter UI.
 * Kept free of server-only imports so client components can use them.
 */
export type MediaType = "movie" | "tv";

const CURRENT_YEAR = new Date().getFullYear();

/** The four most recent years get a chip; everything before is "older". */
export const YEAR_OPTIONS = [0, 1, 2, 3].map((offset) => String(CURRENT_YEAR - offset));
export const OLDER_THAN_YEAR = CURRENT_YEAR - 3;

export type SortKey = "recent" | "popular" | "oldest" | "topRated" | "az";

export const SORT_OPTIONS: Record<MediaType, { key: SortKey; value: string }[]> = {
  movie: [
    { key: "recent", value: "primary_release_date.desc" },
    { key: "popular", value: "popularity.desc" },
    { key: "oldest", value: "primary_release_date.asc" },
    { key: "topRated", value: "vote_average.desc" },
    { key: "az", value: "title.asc" },
  ],
  tv: [
    { key: "recent", value: "first_air_date.desc" },
    { key: "popular", value: "popularity.desc" },
    { key: "oldest", value: "first_air_date.asc" },
    { key: "topRated", value: "vote_average.desc" },
    { key: "az", value: "name.asc" },
  ],
};

/** Returns a sort value valid for the media type (unknown values → default). */
export function resolveSort(value: string | undefined, type: MediaType, fallback?: string) {
  const options = SORT_OPTIONS[type];
  const match = options.find((option) => option.value === value);
  return match?.value ?? fallback ?? options[0].value;
}

export type GenreKey = `g${number}`;

/** TMDB genre IDs differ between movies and TV. Names come from `genres.*`. */
export const GENRE_OPTIONS: Record<MediaType, string[]> = {
  movie: ["28", "12", "16", "35", "80", "99", "18", "14", "27", "10749", "878", "53"],
  tv: ["10759", "16", "35", "80", "99", "18", "10751", "9648", "10765", "10768"],
};

/** Genres offered as shortcuts in the search dialog. */
export const SEARCH_GENRES = ["28", "16", "99", "18", "27", "10751", "14", "36", "10402", "878", "53", "37", "9648"];
