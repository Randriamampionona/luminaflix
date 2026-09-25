export type Movie = {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  media_type?: "movie" | "tv" | "person";
  origin_country?: string[];
  backdrop_path: string;
  poster_path: string;
  first_air_date: string;
  overview: string;
  release_date: string;
  vote_average: number;
  original_language: string;
  original_name: string;
  adult: boolean;
  genre_ids: number[];
  popularity: number;
  video: boolean;
  vote_count: number;
  external_ids?: {
    imdb_id: string | null;
    wikidata_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };
};

export type TMDBResponse = {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
};

export type Genre = {
  id: number;
  name: string;
};

export type GenreResponse = {
  genres: Genre[];
};

export type AnimeEpisode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string;
  air_date: string;
};
