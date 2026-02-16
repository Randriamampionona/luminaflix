"use client";

import { useState, useEffect, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import {
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  BookmarkCheck,
  Loader2,
} from "lucide-react";
import { handleMediaReaction, toggleFavorite } from "@/action/stream-actions";
import { doc, onSnapshot } from "firebase/firestore";
import { clientDb } from "@/lib/firebase";

type StreamActionSuiteType = {
  type: "MOVIE" | "K_DRAMA" | "ANIME";
  mediaId: string;
  season?: number;
  episode?: number;
};

export default function StreamActionSuite({
  type,
  mediaId,
  season,
  episode,
}: StreamActionSuiteType) {
  const { user } = useUser();
  const userId = user?.id;

  // --- UI STATES ---
  const [inWatchlist, setInWatchlist] = useState(false);
  const [likeState, setLikeState] = useState<"liked" | "disliked" | null>(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });

  // --- LOADING STATES ---
  const [isLoading, setIsLoading] = useState(true); // Initial Fetch
  const [isPending, startTransition] = useTransition(); // Global server state
  const [activeAction, setActiveAction] = useState<
    "like" | "dislike" | "fav" | null
  >(null);

  // --- STYLING CONSTANTS ---
  const btnBase =
    "group relative flex items-center justify-center transition-all duration-500 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed";
  const labelStyle =
    "text-[10px] font-black uppercase tracking-[0.2em] italic transition-all duration-500";

  const formatCount = (num: number) => {
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  };

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    const docId =
      type === "MOVIE" ? mediaId : `${mediaId}_S${season}_E${episode}`;

    // Reaction Listener (Global)
    const unsubReactions = onSnapshot(
      doc(clientDb, type, docId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCounts({
            likes: (data.likes || []).length,
            dislikes: (data.dislikes || []).length,
          });
          if (userId) {
            if (data.likes?.includes(userId)) setLikeState("liked");
            else if (data.dislikes?.includes(userId)) setLikeState("disliked");
            else setLikeState(null);
          }
        }
        setIsLoading(false);
      },
    );

    // Favorite Listener (User Specific)
    let unsubFavs = () => {};
    if (userId) {
      unsubFavs = onSnapshot(doc(clientDb, "FAVORITE", userId), (snapshot) => {
        const favs = snapshot.data()?.favorites || [];
        const isMatch = favs.some(
          (f: any) =>
            f.id === mediaId &&
            f.type === type &&
            f.season === (season ?? null) &&
            f.episode === (episode ?? null),
        );
        setInWatchlist(isMatch);
      });
    }

    return () => {
      unsubReactions();
      unsubFavs();
    };
  }, [userId, type, mediaId, season, episode]);

  // --- HANDLERS ---
  const handleAction = (actionType: "like" | "dislike" | "fav") => {
    if (!userId) return alert("Please sign in to interact!");

    setActiveAction(actionType); // Set specific button to loading

    startTransition(async () => {
      try {
        if (actionType === "fav") {
          await toggleFavorite({ mediaId, type, season, episode });
        } else {
          await handleMediaReaction({
            mediaId,
            type,
            season,
            episode,
            action: actionType,
          });
        }
      } finally {
        setActiveAction(null);
      }
    });
  };

  return (
    <div className="flex items-center gap-2 p-1 w-fit">
      {/* FAVORITE BUTTON */}
      <button
        disabled={isPending || isLoading}
        onClick={() => handleAction("fav")}
        className={`${btnBase} h-12 px-6 rounded-xl border transition-all duration-500 ${
          inWatchlist
            ? "bg-cyan-500 border-cyan-400 text-black shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            : "bg-white/5 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="relative h-5 w-5 flex items-center justify-center">
            {activeAction === "fav" ? (
              <Loader2 className="w-5 h-5 animate-spin stroke-[3px]" />
            ) : inWatchlist ? (
              <BookmarkCheck className="w-5 h-5 stroke-[3px] animate-in zoom-in duration-300" />
            ) : (
              <Bookmark className="w-5 h-5 stroke-[2px] group-hover:rotate-12 transition-transform duration-500" />
            )}
          </div>
          <span className={labelStyle}>
            {activeAction === "fav"
              ? "Saving..."
              : inWatchlist
                ? "In Favorites"
                : "Add to Favorite"}
          </span>
        </div>
        {inWatchlist && activeAction !== "fav" && (
          <div className="absolute inset-0 bg-linear-to-b from-white/20 to-transparent opacity-20 pointer-events-none" />
        )}
      </button>

      {/* FEEDBACK GROUP */}
      <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1">
        {/* LIKE BUTTON */}
        <button
          disabled={isPending || isLoading}
          onClick={() => handleAction("like")}
          className={`${btnBase} h-10 px-4 rounded-lg gap-2 ${
            likeState === "liked"
              ? "text-cyan-400"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <div className="relative flex items-center justify-center">
            {activeAction === "like" ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <ThumbsUp
                className={`w-4 h-4 transition-all ${
                  likeState === "liked"
                    ? "fill-cyan-400 scale-110 drop-shadow-[0_0_10px_#06b6d4]"
                    : "group-hover:-translate-y-1"
                }`}
              />
            )}
          </div>
          <span
            className={`text-[10px] font-bold tabular-nums ${isLoading ? "animate-pulse bg-white/10 rounded w-6 h-3" : ""}`}
          >
            {!isLoading && formatCount(counts.likes)}
          </span>
        </button>

        <div className="w-px h-4 bg-white/10" />

        {/* DISLIKE BUTTON */}
        <button
          disabled={isPending || isLoading}
          onClick={() => handleAction("dislike")}
          className={`${btnBase} h-10 px-4 rounded-lg gap-2 ${
            likeState === "disliked"
              ? "text-white"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <div className="relative flex items-center justify-center">
            {activeAction === "dislike" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ThumbsDown
                className={`w-4 h-4 transition-all ${
                  likeState === "disliked"
                    ? "fill-white scale-110"
                    : "group-hover:translate-y-1"
                }`}
              />
            )}
          </div>
          <span
            className={`text-[10px] font-bold tabular-nums ${isLoading ? "animate-pulse bg-white/10 rounded w-6 h-3" : ""}`}
          >
            {!isLoading && formatCount(counts.dislikes)}
          </span>
        </button>
      </div>
    </div>
  );
}
