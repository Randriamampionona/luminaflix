import "server-only";
import { unstable_cache } from "next/cache";
import { getDb } from "@/lib/firebase-admin";

/**
 * Cached Firestore reads for data shown on every player / favorites page.
 * Firestore budget: a document is read once per 10 min instead of on every
 * page view; the actions that change it expire the cache right away
 * (revalidateTag with the tags below), so users always see their own changes.
 */
const TTL_SECONDS = 600;

export const reactionsTag = (collection: string, docId: string) => `reactions:${collection}:${docId}`;
export const favoritesTag = (userId: string) => `favorites:${userId}`;

interface ReactionDoc {
  likes: string[];
  dislikes: string[];
}

/** `{MOVIE|ANIME|K_DRAMA}/{docId}` → likes / dislikes (user id lists). */
export function readReactions(collection: string, docId: string): Promise<ReactionDoc> {
  return unstable_cache(
    async () => {
      const data = (await getDb().collection(collection).doc(docId).get()).data();
      return {
        likes: Array.isArray(data?.likes) ? (data.likes as string[]) : [],
        dislikes: Array.isArray(data?.dislikes) ? (data.dislikes as string[]) : [],
      };
    },
    ["reactions-v1", collection, docId],
    { revalidate: TTL_SECONDS, tags: [reactionsTag(collection, docId)] },
  )();
}

/** `FAVORITE/{userId}.favorites` (raw stored items). */
export function readFavorites<T = Record<string, unknown>>(userId: string): Promise<T[]> {
  return unstable_cache(
    async () => {
      const data = (await getDb().collection("FAVORITE").doc(userId).get()).data();
      return Array.isArray(data?.favorites) ? (data.favorites as T[]) : [];
    },
    ["favorites-v1", userId],
    { revalidate: TTL_SECONDS, tags: [favoritesTag(userId)] },
  )();
}
