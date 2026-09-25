"use server";

import { auth } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import {
  MEDIA_TYPES,
  reactionDocId,
  type MediaInteraction,
  type MediaRef,
  type ReactionResult,
  type FavoriteResult,
} from "@/lib/media-interactions";

/**
 * Likes, dislikes and favorites. All reads and writes go through the Admin
 * SDK on the server, authenticated with Clerk's `userId`.
 *
 * BUG FIX (player buttons): the player used to read its state with the
 * *client* Firestore SDK (`onSnapshot`). Users sign in with Clerk, not
 * Firebase Auth, so those reads depend on public security rules — when they
 * are denied, writes still succeeded here but the buttons never changed and
 * counts stayed at 0. State now comes from these actions instead, and every
 * mutation returns the authoritative new state.
 *
 * Storage (unchanged, so existing data keeps working):
 * - `{MOVIE|ANIME|K_DRAMA}/{id | id_S{n}_E{n}}` → { likes: userId[], dislikes: userId[] }
 * - `FAVORITE/{clerkUserId}` → { favorites: [{ id, type, season, episode, created_date }] }
 */

interface StoredFavorite {
  id: string | number;
  type: string;
  season?: number | null;
  episode?: number | null;
  created_date?: string;
}

function normalize({ mediaId, type, season, episode }: MediaRef) {
  if (!MEDIA_TYPES.includes(type) || !/^\d+$/.test(String(mediaId))) return null;
  const isMovie = type === "MOVIE";
  // Movies are stored per title, series per episode.
  const s = isMovie ? null : Number(season ?? NaN);
  const e = isMovie ? null : Number(episode ?? NaN);
  if (!isMovie && (!Number.isInteger(s) || !Number.isInteger(e))) return null;
  return { mediaId: String(mediaId), type, season: s, episode: e };
}

type NormalizedRef = NonNullable<ReturnType<typeof normalize>>;

const isSameFavorite = (fav: StoredFavorite, ref: NormalizedRef) =>
  String(fav.id) === ref.mediaId &&
  fav.type === ref.type &&
  (fav.season ?? null) === ref.season &&
  (fav.episode ?? null) === ref.episode;

function toInteraction(
  data: { likes?: string[]; dislikes?: string[] } | undefined,
  userId: string | null,
  isFavorite: boolean,
): MediaInteraction {
  const likes = data?.likes ?? [];
  const dislikes = data?.dislikes ?? [];
  return {
    likes: likes.length,
    dislikes: dislikes.length,
    reaction: userId && likes.includes(userId) ? "like" : userId && dislikes.includes(userId) ? "dislike" : null,
    isFavorite,
  };
}

const EMPTY: MediaInteraction = { likes: 0, dislikes: 0, reaction: null, isFavorite: false };

/** The player must never wait on a stuck Firestore connection. */
const READ_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Firestore read timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Initial state for the player buttons (called by the watch pages). */
export async function getMediaInteraction(input: MediaRef): Promise<MediaInteraction> {
  const ref = normalize(input);
  if (!ref) return EMPTY;

  // Never rejects: the promise is handed to a client component, so any
  // failure must resolve to a usable (empty) state instead of an error page.
  try {
    const { userId } = await auth();
    const db = getDb();
    const [reactionSnap, favoriteSnap] = await withTimeout(
      Promise.all([
        db.collection(ref.type).doc(reactionDocId(ref)).get(),
        userId ? db.collection("FAVORITE").doc(userId).get() : Promise.resolve(null),
      ]),
      READ_TIMEOUT_MS,
    );
    const favorites: StoredFavorite[] = favoriteSnap?.data()?.favorites ?? [];
    return toInteraction(
      reactionSnap.data(),
      userId,
      favorites.some((fav) => isSameFavorite(fav, ref)),
    );
  } catch (error) {
    unstable_rethrow(error);
    logFirebaseError("interactions", error);
    return EMPTY;
  }
}

/** Toggles a like/dislike and returns the new counts and the user's reaction. */
export async function handleMediaReaction(input: MediaRef & { action: "like" | "dislike" }): Promise<ReactionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref || (input.action !== "like" && input.action !== "dislike")) {
    return { success: false, error: "INVALID" };
  }

  try {
    const db = getDb();
    const docRef = db.collection(ref.type).doc(reactionDocId(ref));
    // Transaction: two quick clicks can't interleave their read/write.
    const next = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      let likes: string[] = snap.data()?.likes ?? [];
      let dislikes: string[] = snap.data()?.dislikes ?? [];

      if (input.action === "like") {
        const had = likes.includes(userId);
        likes = had ? likes.filter((id) => id !== userId) : [...likes, userId];
        if (!had) dislikes = dislikes.filter((id) => id !== userId);
      } else {
        const had = dislikes.includes(userId);
        dislikes = had ? dislikes.filter((id) => id !== userId) : [...dislikes, userId];
        if (!had) likes = likes.filter((id) => id !== userId);
      }

      tx.set(docRef, { likes, dislikes }, { merge: true });
      return { likes, dislikes };
    });

    const { likes, dislikes, reaction } = toInteraction(next, userId, false);
    return { success: true, interaction: { likes, dislikes, reaction } };
  } catch (error) {
    logFirebaseError("reactions", error);
    return { success: false, error: "FAILED" };
  }
}

/** Adds or removes a title/episode from the user's favorites. */
export async function toggleFavorite(input: MediaRef): Promise<FavoriteResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref) return { success: false, error: "INVALID" };

  try {
    const db = getDb();
    const docRef = db.collection("FAVORITE").doc(userId);
    const added = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const favorites: StoredFavorite[] = snap.data()?.favorites ?? [];
      const exists = favorites.some((fav) => isSameFavorite(fav, ref));

      const next = exists
        ? favorites.filter((fav) => !isSameFavorite(fav, ref))
        : [
            ...favorites,
            {
              id: ref.mediaId,
              type: ref.type,
              season: ref.season,
              episode: ref.episode,
              created_date: new Date().toISOString(),
            },
          ];

      tx.set(docRef, { favorites: next }, { merge: true });
      return !exists;
    });
    return { success: true, added };
  } catch (error) {
    logFirebaseError("favorites", error);
    return { success: false, error: "FAILED" };
  }
}
