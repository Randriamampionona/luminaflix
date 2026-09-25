"use client";

import { Suspense, use } from "react";
import { Skeleton } from "@/components/layout/skeletons";
import { useMediaActions } from "@/hooks/use-media-actions";
import type { MediaInteraction, MediaRef } from "@/lib/media-interactions";
import DislikeButton from "./dislike-button";
import FavoriteButton from "./favorite-button";
import LikeButton from "./like-button";

interface PlayerActionsProps {
  mediaRef: MediaRef;
  /**
   * Started on the server and *not* awaited there: the page and the player
   * render immediately and only this bar waits (behind its skeleton) for the
   * Firestore read.
   */
  interaction: Promise<MediaInteraction>;
}

/**
 * Like / Dislike / Favorite bar under the player. Render with a `key` per
 * title/episode so the state resets when the user moves to another episode.
 */
export default function PlayerActions(props: PlayerActionsProps) {
  return (
    <Suspense fallback={<PlayerActionsSkeleton />}>
      <PlayerActionsBar {...props} />
    </Suspense>
  );
}

function PlayerActionsSkeleton() {
  return (
    <div aria-hidden className="flex gap-2 p-1">
      <Skeleton className="h-12 w-44 rounded-xl" />
      <Skeleton className="h-12 w-36 rounded-xl" />
    </div>
  );
}

function PlayerActionsBar({ mediaRef, interaction }: PlayerActionsProps) {
  const initial = use(interaction);
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
