import { auth } from "@clerk/nextjs/server";
import { AlertCircle, Clock, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { getMediaInteraction } from "@/action/stream-actions";
import PageAd from "@/components/ads/page-ad";
import CommunityPlayer from "@/components/community/community-player";
import CommunityRow from "@/components/community/community-row";
import { Container } from "@/components/layout/container";
import { PageShell } from "@/components/layout/page-shell";
import PlayerActions from "@/components/player/actions/player-actions";
import { isAdminUserId } from "@/lib/analytics/admin";
import { findApprovedCommunity, getCommunityVideo } from "@/lib/community/server";
import {
  communityDisplayTitle,
  communityPoster,
  communityWatchHref,
  isEpisodic,
  toCardVideo,
  type CommunityCategory,
} from "@/lib/community/types";
import { SITE_URL } from "@/lib/site-url";
import { spacing } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Metadata of a community player page (not proposed to search engines, like the other players). */
export async function communityMetadata(id: string): Promise<Metadata> {
  const video = await getCommunityVideo(id);
  if (!video || video.status !== "approved") return { robots: { index: false } };
  const title = communityDisplayTitle(video);
  const poster = communityPoster(video);
  const image = poster ? (poster.startsWith("/") ? `${SITE_URL}${poster}` : poster) : undefined;
  return {
    title,
    description: video.description.slice(0, 160),
    openGraph: { title, description: video.description.slice(0, 200), images: image ? [{ url: image }] : undefined },
    robots: { index: false, follow: true },
  };
}

/**
 * Player page of a community upload (ids starting with com_), rendered by
 * /movies/[id], /k-drama/play/[id], /tv-shows/play/[id] and /anime/play/[id]:
 * DoodStream iframe instead of the FR/EN servers, likes and favorites like any
 * title, and more videos from the community.
 */
export default async function CommunityWatch({ id, route }: { id: string; route: CommunityCategory }) {
  const [video, t, tc, format, { userId }] = await Promise.all([
    getCommunityVideo(id),
    getTranslations("community.player"),
    getTranslations("community"),
    getFormatter(),
    auth(),
  ]);

  // Pending / declined uploads: only their uploader and the admin can open them.
  const visible =
    !!video && (video.status === "approved" || (!!userId && (userId === video.uploaderId || isAdminUserId(userId))));
  if (!video || !visible) {
    return (
      <PageShell containerClassName="max-w-2xl">
        <div className="space-y-4 py-10 text-center">
          <AlertCircle className="mx-auto h-14 w-14 text-red-500" aria-hidden />
          <h1 className="text-3xl font-black text-foreground uppercase italic">{t("notFound")}</h1>
          <p className="text-sm text-fg-muted">{t("notFoundBody")}</p>
          <Link
            href="/community/browse"
            className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-black uppercase"
          >
            {tc("viewAll")}
          </Link>
        </div>
      </PageShell>
    );
  }
  // Opened through another section's player route: go to its own.
  if (video.category !== route) redirect(communityWatchHref(video));

  const title = communityDisplayTitle(video);
  const interaction = getMediaInteraction({ mediaId: video.id, type: "MOVIE" });
  const more = (await findApprovedCommunity({ category: video.category }))
    .filter((v) => v.id !== video.id)
    .slice(0, 18)
    .map(toCardVideo);
  const duration = video.durationSec
    ? `${Math.floor(video.durationSec / 3600) ? `${Math.floor(video.durationSec / 3600)} h ` : ""}${Math.round((video.durationSec % 3600) / 60)} min`
    : null;
  const facts: [string, string | null][] = [
    [t("year"), video.year ? String(video.year) : null],
    [t("duration"), duration],
    [t("language"), video.language ? tc(`languages.${video.language}` as "languages.fr") : null],
    [t("genres"), video.genres.length ? video.genres.map((g) => tc(`genres.${g}`)).join(", ") : null],
    [t("cast"), video.cast],
  ];

  return (
    <main className={cn("min-h-screen bg-background pb-16 text-foreground", spacing.pageTop)}>
      <Container className={spacing.stack}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-violet-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
              {tc("badge")}
            </span>
            <span className="rounded bg-cyan-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-black uppercase">
              {tc(`category.${video.category}`)}
            </span>
            {isEpisodic(video.category) && (
              <span className="rounded border border-line-strong bg-tint px-2 py-0.5 text-[10px] font-black text-fg-soft">
                {tc("episodeTag", { season: video.season ?? 1, episode: video.episode ?? 1 })}
              </span>
            )}
            {video.adult && (
              <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">
                {tc("adultBadge")}
              </span>
            )}
          </div>
          <h1 className="text-3xl leading-tight font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="text-xs text-fg-subtle">
            {tc("sharedBy", { name: video.uploaderName })} ·{" "}
            {format.dateTime(new Date(video.createdAt), { dateStyle: "medium" })}
          </p>
        </div>

        {video.status !== "approved" && (
          <p className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-fg-soft">
            {video.status === "pending" ? (
              <Clock className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden />
            )}
            {video.status === "pending" ? t("pendingNotice") : t("rejectedNotice")}
          </p>
        )}

        <div className="space-y-3">
          <CommunityPlayer embedUrl={video.doodEmbedUrl} title={title} adult={video.adult} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-fg-subtle">
              {t("server")} · {t("reportHint")}
            </p>
            <PlayerActions key={video.id} mediaRef={{ mediaId: video.id, type: "MOVIE" }} interaction={interaction} />
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85 sm:text-base">
            {video.description}
          </p>
          <dl className="grid content-start gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-1">
            {facts
              .filter(([, value]) => value)
              .map(([name, value]) => (
                <div key={name} className="bg-surface px-5 py-3.5">
                  <dt className="text-[10px] font-black tracking-widest text-fg-subtle uppercase">{name}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </Container>

      <CommunityRow title={t("more")} videos={more} />
      <Container>
        <PageAd />
      </Container>
    </main>
  );
}
