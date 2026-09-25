"use server";

import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";
import { db } from "@/lib/firebase-admin";

type MediaType = "MOVIE" | "K_DRAMA" | "ANIME";
const MEDIA_TYPES: MediaType[] = ["MOVIE", "K_DRAMA", "ANIME"];

interface MediaRef {
  mediaId: string;
  type: MediaType;
  season?: number | null;
  episode?: number | null;
}

type ActionResult = { success: true; added?: boolean } | { success: false; error: "UNAUTHORIZED" | "INVALID" | "FAILED" };

/**
 * BUG FIX: movies are always stored with season/episode = null. Previously a
 * caller passing a season for a MOVIE created a duplicate entry because the
 * existence check compared against the raw value.
 */
function normalize({ mediaId, type, season, episode }: MediaRef) {
  if (!MEDIA_TYPES.includes(type) || !/^\d+$/.test(String(mediaId))) return null;
  const isMovie = type === "MOVIE";
  const s = isMovie ? null : Number(season ?? NaN);
  const e = isMovie ? null : Number(episode ?? NaN);
  if (!isMovie && (!Number.isInteger(s) || !Number.isInteger(e))) return null;
  return { mediaId: String(mediaId), type, season: s, episode: e };
}

export async function handleMediaReaction(
  input: MediaRef & { action: "like" | "dislike" },
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref || (input.action !== "like" && input.action !== "dislike")) {
    return { success: false, error: "INVALID" };
  }

  const docId = ref.type === "MOVIE" ? ref.mediaId : `${ref.mediaId}_S${ref.season}_E${ref.episode}`;
  const docRef = db.collection(ref.type).doc(docId);
  const { arrayUnion, arrayRemove } = admin.firestore.FieldValue;

  try {
    // Transaction: two quick clicks can no longer interleave read/write.
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const data = snap.data() ?? {};
      const likes: string[] = data.likes ?? [];
      const dislikes: string[] = data.dislikes ?? [];

      if (!snap.exists) {
        tx.set(docRef, {
          likes: input.action === "like" ? [userId] : [],
          dislikes: input.action === "dislike" ? [userId] : [],
        });
        return;
      }

      if (input.action === "like") {
        tx.update(
          docRef,
          likes.includes(userId)
            ? { likes: arrayRemove(userId) }
            : { likes: arrayUnion(userId), dislikes: arrayRemove(userId) },
        );
      } else {
        tx.update(
          docRef,
          dislikes.includes(userId)
            ? { dislikes: arrayRemove(userId) }
            : { dislikes: arrayUnion(userId), likes: arrayRemove(userId) },
        );
      }
    });
    return { success: true };
  } catch (error) {
    console.error("[reactions] failed", error);
    return { success: false, error: "FAILED" };
  }
}

export async function toggleFavorite(input: MediaRef): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: "UNAUTHORIZED" };

  const ref = normalize(input);
  if (!ref) return { success: false, error: "INVALID" };

  const docRef = db.collection("FAVORITE").doc(userId);

  try {
    const added = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const favorites: { id: string; type: MediaType; season: number | null; episode: number | null }[] =
        snap.data()?.favorites ?? [];

      const exists = favorites.some(
        (fav) =>
          String(fav.id) === ref.mediaId &&
          fav.type === ref.type &&
          (fav.season ?? null) === ref.season &&
          (fav.episode ?? null) === ref.episode,
      );

      const next = exists
        ? favorites.filter(
            (fav) =>
              !(
                String(fav.id) === ref.mediaId &&
                fav.type === ref.type &&
                (fav.season ?? null) === ref.season &&
                (fav.episode ?? null) === ref.episode
              ),
          )
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
    console.error("[favorites] toggle failed", error);
    return { success: false, error: "FAILED" };
  }
}
