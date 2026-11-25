import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { communityPoster, communityWatchHref, isEpisodic, type CommunityVideo } from "@/lib/community/types";

const POSTER_SIZES =
  "(min-width: 1280px) 200px, (min-width: 1024px) 22vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

export type CommunityCardVideo = Pick<
  CommunityVideo,
  | "id"
  | "category"
  | "title"
  | "seriesTitle"
  | "season"
  | "episode"
  | "year"
  | "language"
  | "hasPoster"
  | "posterUrl"
  | "doodThumbnail"
  | "adult"
  | "uploaderName"
>;

/**
 * Same look as the movie cards (components/movie-card.tsx), for a community
 * upload: "Community" badge (+ "18+" when an admin tagged it), no trailer
 * preview, and a click goes straight to its player.
 */
export default function CommunityCard({
  video,
  sizes = POSTER_SIZES,
  priority = false,
}: {
  video: CommunityCardVideo;
  sizes?: string;
  priority?: boolean;
}) {
  const t = useTranslations("community");
  const poster = communityPoster(video);
  const episodic = isEpisodic(video.category);
  const name = episodic ? video.seriesTitle || video.title : video.title;

  return (
    <Link
      href={communityWatchHref(video)}
      aria-label={t("watch", { title: name })}
      className="group relative block w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
    >
      <div className="relative aspect-2/3 overflow-hidden rounded-md border border-line bg-elevated shadow-lg">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-[10px] font-black tracking-widest text-fg-faint uppercase">
            {name}
          </div>
        )}

        <span className="absolute top-2 right-2 z-10 rounded bg-cyan-500 px-2 py-0.5 text-[8px] font-black tracking-tighter text-black uppercase">
          {t(`category.${video.category}`)}
        </span>
        {episodic && (
          <span className="absolute top-2 left-2 z-10 rounded border border-white/10 bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-md">
            {t("episodeTag", { season: video.season ?? 1, episode: video.episode ?? 1 })}
          </span>
        )}
        <div className="absolute bottom-2 left-2 z-10 flex gap-1">
          <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white uppercase shadow">
            {t("badge")}
          </span>
          {video.adult && (
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black tracking-wider text-white shadow">
              {t("adultBadge")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 px-1">
        <h3 className="truncate text-xs font-bold tracking-tight text-foreground uppercase transition-colors group-hover:text-brand-bright">
          {name}
        </h3>
        <p className="flex items-center gap-2 text-[10px] font-medium text-fg-subtle">
          {video.year && <span>{video.year}</span>}
          {video.year && video.language && <span aria-hidden>•</span>}
          {video.language && video.language !== "other" && (
            <span className="font-bold text-brand uppercase">{video.language}</span>
          )}
          <span aria-hidden>•</span>
          <span className="truncate text-foreground/60">{video.uploaderName}</span>
        </p>
      </div>
    </Link>
  );
}
