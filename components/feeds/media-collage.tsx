import type { FbMedia } from "@/lib/facebook";
import { cn } from "@/lib/utils";
import FeedVideo from "./feed-video";

/** One tile of the collage (image or video). */
function Tile({ media, className, more }: { media: FbMedia; className?: string; more?: number }) {
  return (
    <div className={cn("relative overflow-hidden bg-tint", className)}>
      {media.kind === "video" ? (
        <FeedVideo src={media.src} poster={media.poster} className="h-full w-full" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL: no resizing parameters)
        <img src={media.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      )}
      {more ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-black text-white">
          +{more}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Social-feed layout of a post's media: 1 = full width (natural ratio, capped),
 * 2 = side by side, 3 = one big + two, 4+ = 2×2 with "+N" on the last tile.
 * Reels keep their vertical format.
 */
export default function MediaCollage({ media, reel }: { media: FbMedia[]; reel: boolean }) {
  if (!media.length) return null;
  const [first] = media;

  if (media.length === 1) {
    if (first.kind === "video") {
      return (
        <FeedVideo
          src={first.src}
          poster={first.poster}
          reel={reel}
          className={cn(reel ? "mx-auto aspect-9/16 h-[min(640px,75vh)] max-w-full" : "aspect-video w-full")}
        />
      );
    }
    const ratio = first.width && first.height ? first.width / first.height : null;
    return (
      <div className="flex max-h-[640px] justify-center overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL) */}
        <img
          src={first.src}
          alt=""
          loading="lazy"
          decoding="async"
          style={ratio ? { aspectRatio: String(ratio) } : undefined}
          className="max-h-[640px] w-full object-contain"
        />
      </div>
    );
  }

  if (media.length === 2) {
    return (
      <div className="grid aspect-2/1 grid-cols-2 gap-0.5">
        {media.map((m, i) => (
          <Tile key={i} media={m} />
        ))}
      </div>
    );
  }

  if (media.length === 3) {
    return (
      <div className="grid aspect-4/3 grid-cols-2 grid-rows-2 gap-0.5">
        <Tile media={media[0]} className="row-span-2" />
        <Tile media={media[1]} />
        <Tile media={media[2]} />
      </div>
    );
  }

  const extra = media.length - 4;
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5">
      {media.slice(0, 4).map((m, i) => (
        <Tile key={i} media={m} more={i === 3 && extra > 0 ? extra : undefined} />
      ))}
    </div>
  );
}
