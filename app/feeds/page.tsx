import { ArrowDown, ExternalLink, Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageAd from "@/components/ads/page-ad";
import PostCard from "@/components/feeds/post-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { facebookConfigured, getFacebookPage, getFacebookPosts } from "@/lib/facebook";

export async function generateMetadata(): Promise<Metadata> {
  const [t, tf] = await Promise.all([getTranslations("metadata.pages"), getTranslations("feeds")]);
  return { title: t("feeds"), description: tf("description"), alternates: { canonical: "/feeds" } };
}

type SearchParams = Promise<{ after?: string }>;

/** /feeds — the LuminaFlix Facebook Page's posts, as a social feed (8 per page). */
export default async function FeedsPage({ searchParams }: { searchParams: SearchParams }) {
  const { after } = await searchParams;
  const cursor = after && /^[\w-]{1,300}$/.test(after) ? after : undefined;
  const [t, page, feed] = await Promise.all([getTranslations("feeds"), getFacebookPage(), getFacebookPosts(cursor)]);

  return (
    <PageShell containerClassName="max-w-2xl">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />

      {page && (
        <div className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
          {page.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- Facebook CDN image (signed URL)
            <img src={page.picture} alt="" className="h-14 w-14 rounded-full border border-line-strong object-cover" />
          ) : (
            <span className="h-14 w-14 rounded-full bg-cyan-500" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-foreground">{page.name}</p>
            {page.followers !== null && (
              <p className="text-xs text-fg-subtle">{t("followers", { count: page.followers })}</p>
            )}
          </div>
          <a
            href={page.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1877f2] px-3 py-2.5 text-[10px] font-black tracking-widest text-white uppercase hover:bg-[#166fe0]"
          >
            {t("follow")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      )}

      {!facebookConfigured() || !page || !feed ? (
        <p className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-6 text-sm text-fg-muted">
          <Newspaper className="h-5 w-5 shrink-0 text-fg-faint" aria-hidden />
          {facebookConfigured() ? t("unavailable") : t("notConfigured")}
        </p>
      ) : feed.posts.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-6 text-center text-sm text-fg-muted">{t("empty")}</p>
      ) : (
        <div className="space-y-6">
          {feed.posts.map((post) => (
            <PostCard key={post.id} post={post} page={page} />
          ))}
        </div>
      )}

      {feed?.next && (
        <Link
          href={`/feeds?after=${encodeURIComponent(feed.next)}`}
          className="flex items-center justify-center gap-2 rounded-2xl border border-line-strong bg-tint py-3.5 text-xs font-black tracking-widest text-fg-soft uppercase hover:text-foreground"
        >
          <ArrowDown className="h-4 w-4" aria-hidden />
          {t("loadMore")}
        </Link>
      )}

      <PageAd />
    </PageShell>
  );
}
