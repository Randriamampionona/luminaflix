"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "");

/**
 * Normalizes 'MOVIE' to 'movie' and everything else (ANIME, K_DRAMA) to 'tv'
 */
async function fetchMediaDetails(
  id: string,
  type: string,
  display_lang?: string,
) {
  const mediaType = type.toUpperCase() === "MOVIE" ? "movie" : "tv";
  const url = `${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}&append_to_response=images&language=${display_lang || "en-US"}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

/**
 * Fetches the specific name of an episode (e.g., "The Morning of the Prophecy")
 */
async function fetchEpisodeTitle(
  id: string,
  season: number,
  episode: number,
  display_lang?: string,
) {
  const url = `${BASE_URL}/tv/${id}/season/${season}/episode/${episode}?api_key=${API_KEY}&language=${display_lang || "en-US"}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name;
  } catch (error) {
    return null;
  }
}

export async function getUserFavorites(display_lang?: string) {
  const { userId } = await auth();
  if (!userId) return { results: [], total_results: 0 };

  try {
    const docSnap = await db.collection("FAVORITE").doc(userId).get();
    if (!docSnap.exists) return { results: [], total_results: 0 };

    const favoritesList = docSnap.data()?.favorites || [];

    const hydratedResults = await Promise.all(
      favoritesList.map(async (fav: any) => {
        try {
          // 1. Fetch the main Media object (Title, Poster, etc.)
          const details = await fetchMediaDetails(
            String(fav.id),
            fav.type,
            display_lang,
          );
          if (!details) return null;

          // 2. Fetch Episode Title ONLY if it's not a movie
          let episodeTitle = null;
          if (fav.type !== "MOVIE" && fav.season && fav.episode) {
            episodeTitle = await fetchEpisodeTitle(
              String(fav.id),
              Number(fav.season),
              Number(fav.episode),
              display_lang,
            );
          }

          return {
            ...details,
            // UI Fallbacks
            vote_average: details.vote_average ?? 0,
            title: details.title || details.name || "Unknown Title",
            episode_title: episodeTitle, // This goes to your card!
            release_date: details.release_date || details.first_air_date || "",
            poster_path: details.poster_path,
            backdrop_path: details.backdrop_path,
            // Pass the original DB data back to the UI
            savedType: fav.type,
            savedSeason: fav.season,
            savedEpisode: fav.episode,
            created_date: fav.created_date,
          };
        } catch (err) {
          console.error(`Hydration failed for ID ${fav.id}:`, err);
          return null;
        }
      }),
    );

    // Filter failed items and sort by most recent additions
    const results = hydratedResults
      .filter((item): item is any => item !== null)
      .sort(
        (a, b) =>
          new Date(b.created_date).getTime() -
          new Date(a.created_date).getTime(),
      );

    return {
      results,
      total_results: results.length,
    };
  } catch (error) {
    console.error("Critical Favorites Error:", error);
    return { results: [], total_results: 0 };
  }
}
