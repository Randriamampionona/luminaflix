"use server";

import { db } from "@/lib/firebase-admin";
import { auth } from "@clerk/nextjs/server";
import admin from "firebase-admin";

export async function handleMediaReaction({
  mediaId,
  type,
  season,
  episode,
  action,
}: {
  mediaId: string;
  type: "MOVIE" | "K_DRAMA" | "ANIME";
  season?: number;
  episode?: number;
  action: "like" | "dislike";
}) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("You must be logged in to react.");
  }

  const docId =
    type === "MOVIE" ? mediaId : `${mediaId}_S${season}_E${episode}`;
  const docRef = db.collection(type).doc(docId);

  try {
    const docSnap = await docRef.get();

    // 1. If doc doesn't exist, initialize it and add the reaction
    if (!docSnap.exists) {
      await docRef.set({
        likes: action === "like" ? [userId] : [],
        dislikes: action === "dislike" ? [userId] : [],
      });
      return { success: true };
    }

    const data = docSnap.data();
    const likes = data?.likes || [];
    const dislikes = data?.dislikes || [];

    const isAlreadyLiked = likes.includes(userId);
    const isAlreadyDisliked = dislikes.includes(userId);

    // 2. Logic for "LIKE" click
    if (action === "like") {
      if (isAlreadyLiked) {
        // UNLIKE: User clicked like again
        await docRef.update({
          likes: admin.firestore.FieldValue.arrayRemove(userId),
        });
      } else {
        // LIKE: Add to likes, and ensure they are removed from dislikes
        await docRef.update({
          likes: admin.firestore.FieldValue.arrayUnion(userId),
          dislikes: admin.firestore.FieldValue.arrayRemove(userId),
        });
      }
    }

    // 3. Logic for "DISLIKE" click
    else if (action === "dislike") {
      if (isAlreadyDisliked) {
        // UNDISLIKE: User clicked dislike again
        await docRef.update({
          dislikes: admin.firestore.FieldValue.arrayRemove(userId),
        });
      } else {
        // DISLIKE: Add to dislikes, and ensure they are removed from likes
        await docRef.update({
          dislikes: admin.firestore.FieldValue.arrayUnion(userId),
          likes: admin.firestore.FieldValue.arrayRemove(userId),
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Firestore Error:", error);
    return { error: "Failed to sync reaction." };
  }
}

export async function toggleFavorite({
  mediaId,
  type,
  season,
  episode,
}: {
  mediaId: string;
  type: "MOVIE" | "K_DRAMA" | "ANIME";
  season?: number;
  episode?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const userFavRef = db.collection("FAVORITE").doc(userId);

  try {
    const docSnap = await userFavRef.get();

    // Create the new object data
    // Note: We use a Date object here because serverTimestamp()
    // can be finicky inside arrays depending on the Admin SDK version.
    const newFavorite = {
      type,
      id: mediaId,
      season: type === "MOVIE" ? null : (season ?? null),
      episode: type === "MOVIE" ? null : (episode ?? null),
      created_date: new Date().toISOString(),
    };

    if (!docSnap.exists) {
      // First time: Create doc with the array containing the first item
      await userFavRef.set({ favorites: [newFavorite] });
      return { success: true, added: true };
    }

    const favorites = docSnap.data()?.favorites || [];

    // Check for existence
    const existingIndex = favorites.findIndex(
      (fav: any) =>
        fav.id === mediaId &&
        fav.type === type &&
        fav.season === (season ?? null) &&
        fav.episode === (episode ?? null),
    );

    if (existingIndex > -1) {
      // TOGGLE OFF: Remove the item
      const updatedFavs = favorites.filter(
        (_: any, i: number) => i !== existingIndex,
      );
      await userFavRef.update({ favorites: updatedFavs });
      return { success: true, added: false };
    } else {
      // TOGGLE ON: Add the item
      await userFavRef.update({
        favorites: admin.firestore.FieldValue.arrayUnion(newFavorite),
      });
      return { success: true, added: true };
    }
  } catch (error) {
    console.error("Favorite Error:", error);
    return { error: "Failed to update favorite" };
  }
}
