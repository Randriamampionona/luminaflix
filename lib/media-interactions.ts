/**
 * Shared types/helpers for likes, dislikes and favorites. Safe to import from
 * client components and from the server actions in action/stream-actions.ts.
 */
export type MediaType = "MOVIE" | "K_DRAMA" | "ANIME";
export const MEDIA_TYPES: MediaType[] = ["MOVIE", "K_DRAMA", "ANIME"];

export interface MediaRef {
  mediaId: string;
  type: MediaType;
  season?: number | null;
  episode?: number | null;
}

export type Reaction = "like" | "dislike" | null;

export interface MediaInteraction {
  likes: number;
  dislikes: number;
  /** The signed-in user's reaction (null when signed out). */
  reaction: Reaction;
  isFavorite: boolean;
}

type ActionError = { success: false; error: "UNAUTHORIZED" | "INVALID" | "FAILED" };
export type ReactionResult = { success: true; interaction: Omit<MediaInteraction, "isFavorite"> } | ActionError;
export type FavoriteResult = { success: true; added: boolean } | ActionError;

/** Firestore document id for a title's reactions (per episode for series). */
export function reactionDocId(ref: {
  mediaId: string;
  type: MediaType;
  season?: number | null;
  episode?: number | null;
}) {
  return ref.type === "MOVIE" ? ref.mediaId : `${ref.mediaId}_S${ref.season}_E${ref.episode}`;
}

/**
 * Optimistic like/dislike: what the counts will be once the server applies
 * the toggle. Mirrors the transaction in `handleMediaReaction`.
 */
export function applyReaction(state: MediaInteraction, action: "like" | "dislike"): MediaInteraction {
  const next = { ...state };
  if (state.reaction === action) {
    next.reaction = null;
    if (action === "like") next.likes = Math.max(0, state.likes - 1);
    else next.dislikes = Math.max(0, state.dislikes - 1);
    return next;
  }
  next.reaction = action;
  if (action === "like") {
    next.likes = state.likes + 1;
    if (state.reaction === "dislike") next.dislikes = Math.max(0, state.dislikes - 1);
  } else {
    next.dislikes = state.dislikes + 1;
    if (state.reaction === "like") next.likes = Math.max(0, state.likes - 1);
  }
  return next;
}
