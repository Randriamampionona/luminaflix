"use client";

import { ArrowUpRight, BookmarkMinus, Calendar, MonitorPlay, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { memo, useTransition } from "react";
import { toast } from "sonner";
import type { FavoriteItem } from "@/action/get-favorites.action";
import { toggleFavorite } from "@/action/stream-actions";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const t = useTranslations("pages.favorites");
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const poster = tmdbImage(item.poster_path);

  const href =
    item.savedType === "MOVIE"
      ? `/movies/${item.id}`
      : `/${item.savedType === "K_DRAMA" ? "k-drama" : "anime"}/play/${item.id}?s=${item.savedSeason}&e=${item.savedEpisode}`;

  const handleRemove = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavorite({
        mediaId: String(item.id),
        type: item.savedType,
        season: item.savedSeason,
        episode: item.savedEpisode,
      });
      if (result.success) {
        toast.success(t("removed"));
        router.refresh();
      } else {
        toast.error(t("removeError"));
      }
    });
  };

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-6 overflow-hidden rounded-2xl border border-white/5 bg-white/2 p-4 outline-none transition-colors duration-500 hover:border-cyan-500/40 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-500",
        isPending && "pointer-events-none opacity-50 grayscale",
      )}
    >
      <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
        {poster && (
          <Image src={poster} alt="" fill sizes="96px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <span className="absolute bottom-1 right-1 rounded border border-white/5 bg-black/60 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-white/70 backdrop-blur-md">
          {item.savedType === "MOVIE" ? t("film") : t("series")}
        </span>
      </div>

      <div className="min-w-0 grow py-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="truncate pr-2 text-lg font-black uppercase italic leading-none tracking-tighter transition-colors group-hover:text-cyan-400">
            {item.title}
          </h3>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              aria-label={t("remove")}
              title={t("remove")}
              className="rounded-lg border border-white/5 bg-white/5 p-2 text-zinc-500 transition-colors duration-300 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
            >
              <BookmarkMinus className={cn("h-4 w-4", isPending && "animate-pulse")} />
            </button>
            <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-cyan-400" />
          </div>
        </div>

        {item.episode_title && (
          <p className="mb-2 mt-1.5 truncate text-[10px] font-bold uppercase italic tracking-wider text-cyan-400/80">
            {item.episode_title}
          </p>
        )}

        <div className="mb-3 mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Star className="h-3 w-3 fill-cyan-500 text-cyan-500" />
            <span className="text-[11px] font-black tabular-nums">{item.vote_average.toFixed(1)}</span>
          </span>
          <span aria-hidden className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Calendar className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.release_date?.split("-")[0] || "—"}</span>
          </span>
        </div>

        {item.savedType !== "MOVIE" && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-400">
            <MonitorPlay className="h-3 w-3" />
            <span className="text-[10px] font-black uppercase tracking-tighter">
              S{item.savedSeason} <span className="mx-1 text-white/30">•</span> E{item.savedEpisode}
            </span>
          </span>
        )}

        {/* Locale-aware date via next-intl: no server/client hydration mismatch. */}
        <p className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-zinc-600">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cyan-500/40" />
          {t("savedOn", { date: format.dateTime(new Date(item.created_date), { dateStyle: "medium" }) })}
        </p>
      </div>
    </Link>
  );
}

export default memo(FavoriteCard);
