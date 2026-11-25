import { CheckCircle2, Clock, Film, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { communityDisplayTitle, communityPoster, communityWatchHref, type CommunityVideo } from "@/lib/community/types";
import { cn } from "@/lib/utils";

/** "My shares": a member's uploads with their review status (pending ones are only visible here). */
export default async function MyUploads({ videos }: { videos: CommunityVideo[] }) {
  if (videos.length === 0) return null;
  const [t, tc, format] = await Promise.all([
    getTranslations("community.upload"),
    getTranslations("community"),
    getFormatter(),
  ]);
  const STATUS = {
    pending: { label: t("statusPending"), icon: Clock, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    approved: {
      label: t("statusApproved"),
      icon: CheckCircle2,
      tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    rejected: { label: t("statusRejected"), icon: XCircle, tone: "bg-red-500/15 text-red-500" },
  } as const;

  return (
    <section aria-labelledby="my-uploads" className="space-y-4 rounded-3xl border border-line bg-surface p-5">
      <div>
        <h2 id="my-uploads" className="text-lg font-black text-foreground">
          {t("mineTitle")} <span className="text-fg-faint">({videos.length})</span>
        </h2>
        <p className="text-xs text-fg-muted">{t("mineHint")}</p>
      </div>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide">
        {videos.map((video) => {
          const status = STATUS[video.status];
          const Icon = status.icon;
          const poster = communityPoster(video);
          return (
            <li key={video.id} className="w-40 shrink-0">
              <Link href={communityWatchHref(video)} className="group block space-y-2">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-line-strong bg-tint">
                  {poster ? (
                    <Image src={poster} alt="" fill sizes="160px" className="object-cover" />
                  ) : (
                    <Film className="absolute inset-0 m-auto h-6 w-6 text-fg-faint" aria-hidden />
                  )}
                </div>
                <p className="truncate text-xs font-bold text-foreground group-hover:text-brand-bright">
                  {communityDisplayTitle(video)}
                </p>
                <p
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black",
                    status.tone,
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden />
                  {status.label}
                </p>
                <p className="text-[10px] text-fg-subtle">
                  {tc(`category.${video.category}`)} ·{" "}
                  {format.dateTime(new Date(video.createdAt), { dateStyle: "medium" })}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
