import { auth } from "@clerk/nextjs/server";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import { REVALIDATE, tmdb } from "@/lib/tmdb";

export type FavoriteType = "MOVIE" | "K_DRAMA" | "ANIME";

interface StoredFavorite {
  id: string;
  type: FavoriteType;
  season: number | null;
  episode: number | null;
  created_date: string;
}

interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export interface FavoriteItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date: string;
  episode_title: string | null;
  savedType: FavoriteType;
  savedSeason: number | null;
  savedEpisode: number | null;
  created_date: string;
}

export interface FavoritesResult {
  results: FavoriteItem[];
  total_results: number;
  /**
   * True when the favorites could not be read (e.g. invalid Firebase
   * credentials). The page shows an error instead of "your vault is empty".
   */
  error: boolean;
}

export async function getUserFavorites(): Promise<FavoritesResult> {
  const { userId } = await auth();
  if (!userId) return { results: [], total_results: 0, error: false };

  try {
    const snapshot = await getDb().collection("FAVORITE").doc(userId).get();
    const favorites = (snapshot.data()?.favorites ?? []) as StoredFavorite[];

    const hydrated = await Promise.all(
      favorites.map(async (fav): Promise<FavoriteItem | null> => {
        const mediaType = fav.type === "MOVIE" ? "movie" : "tv";
        const isEpisode = fav.type !== "MOVIE" && fav.season && fav.episode;

        // Details and episode title are fetched in parallel (was sequential).
        const [details, episode] = await Promise.all([
          tmdb<MediaDetails>(`/${mediaType}/${fav.id}`, {}, { revalidate: REVALIDATE.default }),
          isEpisode
            ? tmdb<{ name?: string }>(
                `/tv/${fav.id}/season/${fav.season}/episode/${fav.episode}`,
                {},
                { revalidate: REVALIDATE.default },
              )
            : Promise.resolve(null),
        ]);
        if (!details) return null;

        return {
          id: details.id,
          title: details.title || details.name || "",
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          vote_average: details.vote_average ?? 0,
          release_date: details.release_date || details.first_air_date || "",
          episode_title: episode?.name ?? null,
          savedType: fav.type,
          savedSeason: fav.season,
          savedEpisode: fav.episode,
          created_date: fav.created_date,
        };
      }),
    );

    const results = hydrated
      .filter((item): item is FavoriteItem => item !== null)
      .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    return { results, total_results: results.length, error: false };
  } catch (error) {
    logFirebaseError("favorites", error);
    return { results: [], total_results: 0, error: true };
  }
}
