import { ExternalLink, MessageCircle, Share2, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { FbPage, FbPost } from "@/lib/facebook";
import MediaCollage from "./media-collage";

/** Page avatar + name + time, shared by the feed and the detail page. */
export async function PostAuthor({ page, createdAt }: { page: FbPage; createdAt: string }) {
  const format = await getFormatter();
  return (
    <div className="flex items-center gap-3">
      {page.picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL)
        <img
          src={page.picture}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-line-strong object-cover"
        />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded-full bg-cyan-500" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-foreground">{page.name}</p>
        <time
          dateTime={createdAt}
          className="text-xs text-fg-subtle"
          title={format.dateTime(new Date(createdAt), { dateStyle: "full", timeStyle: "short" })}
        >
          {format.relativeTime(new Date(createdAt), new Date())}
        </time>
      </div>
    </div>
  );
}

/** Counts (likes · comments · shares) — display only, as on Facebook. */
export async function PostStats({ post }: { post: FbPost }) {
  const [t, format] = await Promise.all([getTranslations("feeds"), getFormatter()]);
  const n = (v: number) => format.number(v, { notation: v >= 10000 ? "compact" : "standard" });
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-fg-muted">
      <span className="flex items-center gap-1.5" title={t("likes", { count: post.reactions })}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-white">
          <ThumbsUp className="h-3 w-3 fill-current" aria-hidden />
        </span>
        {n(post.reactions)}
        <span className="sr-only">{t("likes", { count: post.reactions })}</span>
      </span>
      <span className="flex items-center gap-1.5" title={t("comments", { count: post.comments })}>
        <MessageCircle className="h-4 w-4" aria-hidden />
        {n(post.comments)}
        <span className="sr-only">{t("comments", { count: post.comments })}</span>
      </span>
      {post.shares > 0 && (
        <span className="flex items-center gap-1.5" title={t("shares", { count: post.shares })}>
          <Share2 className="h-4 w-4" aria-hidden />
          {n(post.shares)}
          <span className="sr-only">{t("shares", { count: post.shares })}</span>
        </span>
      )}
    </div>
  );
}

/** A post in the feed: author, text (4 lines), media collage, counts; click → detail page. */
export default async function PostCard({ post, page }: { post: FbPost; page: FbPage }) {
  const t = await getTranslations("feeds");
  const href = `/feeds/${post.id}`;
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface">
      <div className="space-y-3 p-4 sm:p-5">
        <PostAuthor page={page} createdAt={post.createdAt} />
        {post.message && (
          <Link href={href} className="block">
            <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
              {post.message}
            </p>
            {post.message.length > 280 && (
              <span className="mt-1 inline-block text-xs font-bold text-brand-bright">{t("readMore")}</span>
            )}
          </Link>
        )}
      </div>
      {post.media.length > 0 && (
        <Link href={href} aria-label={t("openPost")} className="block">
          <MediaCollage media={post.media} reel={post.isReel} />
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <PostStats post={post} />
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black tracking-widest text-fg-soft uppercase hover:text-foreground"
          >
            {t("details")}
          </Link>
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-[#1877f2] px-3 py-2 text-[10px] font-black tracking-widest text-white uppercase hover:bg-[#166fe0]"
          >
            {t("viewOnFacebook")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
