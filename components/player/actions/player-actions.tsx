"use client";

import { useMediaActions } from "@/hooks/use-media-actions";
import type { MediaInteraction, MediaRef } from "@/lib/media-interactions";
import DislikeButton from "./dislike-button";
import FavoriteButton from "./favorite-button";
import LikeButton from "./like-button";

/**
 * Like / Dislike / Favorite bar under the player. Replaces
 * components/stream-action-suite.tsx. Render with a `key` per title/episode
 * so the state resets when the user moves to another episode.
 */
export default function PlayerActions({ mediaRef, initial }: { mediaRef: MediaRef; initial: MediaInteraction }) {
  const { state, pending, ready, like, dislike, favorite } = useMediaActions(mediaRef, initial);
  // Only disabled until Clerk has loaded; while a request is in flight the
  // hook ignores extra clicks, so the optimistic state stays fully visible.
  const busy = !ready;

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center justify-end gap-2 p-1">
      <FavoriteButton active={state.isFavorite} pending={pending === "favorite"} disabled={busy} onClick={favorite} />
      <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        <LikeButton
          active={state.reaction === "like"}
          count={state.likes}
          pending={pending === "like"}
          disabled={busy}
          onClick={like}
        />
        <span aria-hidden className="h-4 w-px bg-white/10" />
        <DislikeButton
          active={state.reaction === "dislike"}
          count={state.dislikes}
          pending={pending === "dislike"}
          disabled={busy}
          onClick={dislike}
        />
      </div>
    </div>
  );
}
