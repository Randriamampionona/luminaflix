export type Movie = {
  id: number;
  title: string;
  name?: string;
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
