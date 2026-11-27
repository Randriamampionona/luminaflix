import { ArrowLeft, ExternalLink, FileQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import PageAd from "@/components/ads/page-ad";
import PostCard, { PostAuthor, PostStats } from "@/components/feeds/post-card";
import PostCarousel from "@/components/feeds/post-carousel";
import { PageShell } from "@/components/layout/page-shell";
import { getFacebookPage, getFacebookPost, getFacebookPosts } from "@/lib/facebook";

type Params = Promise<{ id: string }>;

const excerpt = (text: string, max: number) => {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const [post, t, format] = await Promise.all([getFacebookPost(id), getTranslations("feeds"), getFormatter()]);
  if (!post) return { robots: { index: false } };
  const image = post.media.find((m) => m.kind === "image");
  const poster = image?.kind === "image" ? image.src : post.media[0]?.kind === "video" ? post.media[0].poster : null;
  const title = post.message
    ? excerpt(post.message, 70)
    : t("postTitle", { date: format.dateTime(new Date(post.createdAt), { dateStyle: "long" }) });
  return {
    title,
    description: excerpt(post.message, 160) || undefined,
    alternates: { canonical: `/feeds/${post.id}` },
    openGraph: { title, images: poster ? [{ url: poster }] : undefined },
  };
}

/** Text with clickable links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="text-base leading-relaxed whitespace-pre-line text-foreground/90">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-brand-bright hover:underline"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

/** /feeds/[id] — one Facebook post: full text, every image / video, counts, link to Facebook. */
export default async function FeedPostPage({ params }: { params: Params }) {
  const { id } = await params;
  const [t, format, post, page, recent] = await Promise.all([
    getTranslations("feeds"),
    getFormatter(),
    getFacebookPost(id),
    getFacebookPage(),
    getFacebookPosts(undefined, 4),
  ]);

  if (!post || !page) {
    return (
      <PageShell containerClassName="max-w-2xl">
        <div className="space-y-4 py-10 text-center">
          <FileQuestion className="mx-auto h-14 w-14 text-fg-faint" aria-hidden />
          <h1 className="text-3xl font-black text-foreground uppercase italic">{t("notFound")}</h1>
          <p className="text-sm text-fg-muted">{t("notFoundBody")}</p>
          <Link
            href="/feeds"
            className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-black uppercase"
          >
            {t("backToFeed")}
          </Link>
        </div>
      </PageShell>
    );
  }

  const others = (recent?.posts ?? []).filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <PageShell containerClassName="max-w-3xl">
      <Link
        href="/feeds"
        className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToFeed")}
      </Link>

      <article className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PostAuthor page={page} createdAt={post.createdAt} />
          <p className="text-xs text-fg-subtle">
            {format.dateTime(new Date(post.createdAt), { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        <h1 className="sr-only">
          {post.message
            ? excerpt(post.message, 90)
            : t("postTitle", { date: format.dateTime(new Date(post.createdAt), { dateStyle: "long" }) })}
        </h1>
        {post.message && <RichText text={post.message} />}
        {post.media.length > 0 && <PostCarousel media={post.media} reel={post.isReel} />}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-4">
          <PostStats post={post} />
          <a
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#1877f2] px-4 py-2.5 text-[10px] font-black tracking-widest text-white uppercase hover:bg-[#166fe0]"
          >
            {t("viewOnFacebookLong")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="more-posts" className="space-y-5">
          <h2 id="more-posts" className="text-xl font-black tracking-tight text-foreground uppercase italic">
            {t("moreTitle")}
            <span className="text-brand not-italic">.</span>
          </h2>
          <div className="space-y-6">
            {others.map((p) => (
              <PostCard key={p.id} post={p} page={page} />
            ))}
          </div>
        </section>
      )}

      <PageAd />
    </PageShell>
  );
}
