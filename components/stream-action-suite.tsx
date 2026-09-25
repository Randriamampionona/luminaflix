"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { useFormatter, useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { handleMediaReaction, toggleFavorite } from "@/action/stream-actions";
import { clientDb } from "@/lib/firebase";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { cn } from "@/lib/utils";

type ReactionType = "MOVIE" | "K_DRAMA" | "ANIME";
type ActionKind = "like" | "dislike" | "fav";

interface StreamActionSuiteProps {
  type: ReactionType;
  mediaId: string;
  season?: number;
  episode?: number;
}

interface FavoriteEntry {
  id?: string;
  type?: string;
  season?: number | null;
  episode?: number | null;
}

const btnBase =
  "group relative flex items-center justify-center overflow-hidden transition-all duration-500 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer";
const labelStyle = "text-[10px] font-black uppercase italic tracking-[0.2em] transition-all duration-500";

function StreamActionSuite({ type, mediaId, season, episode }: StreamActionSuiteProps) {
  const t = useTranslations("actions");
  const format = useFormatter();
  const { user } = useUser();
  const userId = user?.id;
  const { requireAuth } = useAuthGate();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [likeState, setLikeState] = useState<"liked" | "disliked" | null>(null);
  const [counts, setCounts] = useState({ likes: 0, dislikes: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);

  // Movies are stored per title; series per episode.
  const normalizedSeason = type === "MOVIE" ? null : (season ?? null);
  const normalizedEpisode = type === "MOVIE" ? null : (episode ?? null);

  useEffect(() => {
    const docId = type === "MOVIE" ? mediaId : `${mediaId}_S${season}_E${episode}`;

    const unsubReactions = onSnapshot(
      doc(clientDb, type, docId),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        const likes: string[] = data.likes ?? [];
        const dislikes: string[] = data.dislikes ?? [];
        setCounts({ likes: likes.length, dislikes: dislikes.length });
        if (userId && likes.includes(userId)) setLikeState("liked");
        else if (userId && dislikes.includes(userId)) setLikeState("disliked");
        else setLikeState(null);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    let unsubFavs = () => {};
    if (userId) {
      unsubFavs = onSnapshot(
        doc(clientDb, "FAVORITE", userId),
        (snapshot) => {
          const favs: FavoriteEntry[] = snapshot.data()?.favorites ?? [];
          setInWatchlist(
            favs.some(
              (f) =>
                f.id === mediaId &&
                f.type === type &&
                (f.season ?? null) === normalizedSeason &&
                (f.episode ?? null) === normalizedEpisode,
            ),
          );
        },
        () => setInWatchlist(false),
      );
    } else {
      setInWatchlist(false);
    }

    return () => {
      unsubReactions();
      unsubFavs();
    };
  }, [userId, type, mediaId, season, episode, normalizedSeason, normalizedEpisode]);

  const handleAction = (actionType: ActionKind) => {
    // BUG FIX: used to `alert()`; now opens sign-in and returns here afterwards.
    if (!requireAuth()) return;

    setActiveAction(actionType);
    startTransition(async () => {
      try {
        const result =
          actionType === "fav"
            ? await toggleFavorite({ mediaId, type, season, episode })
            : await handleMediaReaction({ mediaId, type, season, episode, action: actionType });
        if (!result.success) toast.error(t("error"));
      } catch {
        toast.error(t("error"));
      } finally {
        setActiveAction(null);
      }
    });
  };

  const compact = (n: number) => format.number(n, { notation: "compact", maximumFractionDigits: 1 });
  const disabled = isPending || isLoading;

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center justify-end gap-2 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleAction("fav")}
        aria-pressed={inWatchlist}
        className={cn(
          btnBase,
          "h-12 rounded-xl border px-6",
          inWatchlist
            ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white",
        )}
      >
        <span className="relative z-10 flex items-center gap-3">
          <span className="relative flex h-5 w-5 items-center justify-center">
            {activeAction === "fav" ? (
              <Loader2 className="h-5 w-5 animate-spin stroke-[3px]" />
            ) : inWatchlist ? (
              <BookmarkCheck className="h-5 w-5 stroke-[3px] animate-in zoom-in duration-300" />
            ) : (
              <Bookmark className="h-5 w-5 stroke-2 transition-transform duration-500 group-hover:rotate-12" />
            )}
          </span>
          <span className={labelStyle}>
            {activeAction === "fav" ? t("saving") : inWatchlist ? t("inFavorites") : t("addFavorite")}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-white/5 p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAction("like")}
          aria-pressed={likeState === "liked"}
          aria-label={t("like")}
          title={t("like")}
          className={cn(
            btnBase,
            "h-10 gap-2 rounded-lg px-4",
            likeState === "liked" ? "text-cyan-400" : "text-zinc-500 hover:text-white",
          )}
        >
          {activeAction === "like" ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : (
            <ThumbsUp
              className={cn(
                "h-4 w-4 transition-all",
                likeState === "liked"
                  ? "scale-110 fill-cyan-400 drop-shadow-[0_0_10px_#06b6d4]"
                  : "group-hover:-translate-y-1",
              )}
            />
          )}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              isLoading && "h-3 w-6 animate-pulse rounded bg-white/10",
            )}
          >
            {!isLoading && compact(counts.likes)}
          </span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAction("dislike")}
          aria-pressed={likeState === "disliked"}
          aria-label={t("dislike")}
          title={t("dislike")}
          className={cn(
            btnBase,
            "h-10 gap-2 rounded-lg px-4",
            likeState === "disliked" ? "text-white" : "text-zinc-500 hover:text-white",
          )}
        >
          {activeAction === "dislike" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ThumbsDown
              className={cn(
                "h-4 w-4 transition-all",
                likeState === "disliked" ? "scale-110 fill-white" : "group-hover:translate-y-1",
              )}
            />
          )}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              isLoading && "h-3 w-6 animate-pulse rounded bg-white/10",
            )}
          >
            {!isLoading && compact(counts.dislikes)}
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(StreamActionSuite);
