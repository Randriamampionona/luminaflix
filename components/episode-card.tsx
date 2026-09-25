"use client";

import { Calendar, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo } from "react";
import { tmdbImage } from "@/lib/media";
import type { AnimeEpisode } from "@/typing";

const FALLBACK_STILL = "https://placehold.co/600x338/111/333?text=No+Preview";

function EpisodeCard({
  ep,
  seriesId,
  seasonNumber,
  path,
}: {
  ep: AnimeEpisode;
  seriesId: string;
  seasonNumber: number;
  path: "anime" | "k-drama";
}) {
  const t = useTranslations();

  // A11Y/UX: the whole card is now the link (previously only a hover-only
  // overlay was clickable, which was invisible on touch screens).
  return (
    <Link
      href={`/${path}/play/${seriesId}?s=${seasonNumber}&e=${ep.episode_number}`}
      aria-label={t("episodes.play", { number: ep.episode_number })}
      className="group relative block aspect-video overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 outline-none transition-colors hover:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <Image
        src={tmdbImage(ep.still_path) ?? FALLBACK_STILL}
        alt=""
        fill
        sizes="(min-width: 1280px) 290px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        className="object-cover opacity-60 transition-[opacity,transform] duration-700 group-hover:scale-110 group-hover:opacity-100"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />

      <div className="absolute bottom-4 left-4 right-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">
            {t("episodes.episodeShort", { number: ep.episode_number })}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <Calendar className="h-2.5 w-2.5" />
            {ep.air_date?.split("-")[0] || t("common.tba")}
          </span>
        </div>
        <h3 className="truncate text-sm font-bold uppercase tracking-tighter text-white">{ep.name}</h3>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-black shadow-[0_0_20px_#06b6d4]">
          <Play className="ml-1 h-5 w-5 fill-current" />
        </span>
      </div>
    </Link>
  );
}

export default memo(EpisodeCard);
