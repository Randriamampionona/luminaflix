"use client";

import {
  Check,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reviewCommunityVideo, setCommunityAdult } from "@/action/community.action";
import {
  communityDisplayTitle,
  communityPoster,
  communityWatchHref,
  type CommunityStatus,
  type CommunityVideo,
} from "@/lib/community/types";
import { cn } from "@/lib/utils";

interface ReviewData {
  pending: CommunityVideo[];
  approved: CommunityVideo[];
  rejected: CommunityVideo[];
  counts: { pending: number; approved: number; rejected: number; total: number };
}

/** Admin moderation: metrics, then the uploads of the chosen status with preview and decisions. */
export default function ReviewDashboard({ data }: { data: ReviewData }) {
  const t = useTranslations("community.review");
  const [tab, setTab] = useState<CommunityStatus>("pending");
  const [preview, setPreview] = useState<CommunityVideo | null>(null);
  const list = data[tab];

  const metrics = [
    { key: "pending" as const, icon: Clock, value: data.counts.pending, tone: "text-amber-500" },
    { key: "approved" as const, icon: Check, value: data.counts.approved, tone: "text-emerald-500" },
    { key: "rejected" as const, icon: XCircle, value: data.counts.rejected, tone: "text-red-500" },
    { key: "total" as const, icon: Upload, value: data.counts.total, tone: "text-brand" },
  ];

  return (
    <div data-no-smartlink className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ key, icon: Icon, value, tone }) => (
          <button
            key={key}
            type="button"
            disabled={key === "total"}
            onClick={() => key !== "total" && setTab(key)}
            className={cn(
              "rounded-3xl border bg-surface p-5 text-left transition-colors",
              tab === key ? "border-cyan-500/60" : "border-line hover:border-line-strong",
              key === "total" && "cursor-default",
            )}
          >
            <Icon className={cn("h-5 w-5", tone)} aria-hidden />
            <p className="mt-3 text-3xl font-black text-foreground">{value}</p>
            <p className="text-[10px] font-black tracking-widest text-fg-subtle uppercase">{t(key)}</p>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-8 text-center text-sm text-fg-muted">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {list.map((video) => (
            <ReviewItem key={video.id} video={video} onPreview={() => setPreview(video)} />
          ))}
        </ul>
      )}

      {preview && <PreviewModal video={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function ReviewItem({ video, onPreview }: { video: CommunityVideo; onPreview: () => void }) {
  const t = useTranslations("community.review");
  const tc = useTranslations("community");
  const format = useFormatter();
  const router = useRouter();
  const [adult, setAdult] = useState(video.adult);
  const [pending, start] = useTransition();
  const poster = communityPoster(video);

  const decide = (decision: "approve" | "reject" | "pending") =>
    start(async () => {
      const result = await reviewCommunityVideo(video.id, decision, adult);
      if (result.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else toast.error(t("failed"));
    });

  const changeRating = (value: boolean) => {
    setAdult(value);
    if (video.status === "pending") return; // saved with the decision
    start(async () => {
      const result = await setCommunityAdult(video.id, value);
      if (result.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else {
        setAdult(!value);
        toast.error(t("failed"));
      }
    });
  };

  return (
    <li className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onPreview}
        aria-label={t("preview")}
        className="group relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-xl border border-line-strong bg-tint"
      >
        {poster ? (
          <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <Film className="absolute inset-0 m-auto h-6 w-6 text-fg-faint" aria-hidden />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <Eye className="h-5 w-5 text-white" aria-hidden />
        </span>
      </button>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-cyan-500 px-1.5 py-0.5 text-[9px] font-black text-black uppercase">
            {tc(`category.${video.category}`)}
          </span>
          {adult && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-black text-white">18+</span>}
          <span className="font-mono text-[10px] text-fg-faint">{video.id}</span>
        </div>
        <p className="truncate text-sm font-black text-foreground">{communityDisplayTitle(video)}</p>
        <p className="line-clamp-2 text-xs text-fg-muted">{video.description}</p>
        <p className="text-[11px] text-fg-subtle">
          {t("uploadedBy", {
            name: video.uploaderName,
            date: format.dateTime(new Date(video.createdAt), { dateStyle: "medium", timeStyle: "short" }),
          })}
          {" · "}
          <span className="font-mono">
            {t("dood")} {video.doodFileCode}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-56">
        {/* Rating */}
        <div
          role="radiogroup"
          aria-label={t("rating")}
          className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-tint p-1"
        >
          {[false, true].map((value) => (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={adult === value}
              disabled={pending}
              onClick={() => changeRating(value)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[10px] font-black uppercase transition-colors",
                adult === value
                  ? value
                    ? "bg-red-600 text-white"
                    : "bg-emerald-600 text-white"
                  : "text-fg-muted hover:text-foreground",
              )}
            >
              {value ? t("adult") : t("standard")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {video.status !== "approved" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("approve")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white uppercase hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              {t("approve")}
            </button>
          )}
          {video.status !== "rejected" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("reject")}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black text-white uppercase hover:bg-red-500 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("reject")}
            </button>
          )}
          {video.status !== "pending" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("pending")}
              aria-label={t("restore")}
              title={t("restore")}
              className="flex items-center justify-center rounded-xl border border-line-strong px-3 py-2 text-fg-muted hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function PreviewModal({ video, onClose }: { video: CommunityVideo; onClose: () => void }) {
  const t = useTranslations("community.review");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={communityDisplayTitle(video)}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 text-white">
          <p className="truncate text-sm font-black">{communityDisplayTitle(video)}</p>
          <div className="flex shrink-0 items-center gap-2">
            {video.status === "approved" && (
              <Link
                href={communityWatchHref(video)}
                target="_blank"
                className="flex items-center gap-1.5 rounded-xl border border-white/25 px-3 py-2 text-[10px] font-black uppercase hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {t("openPlayer")}
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="rounded-xl border border-white/25 p-2 hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
          <iframe
            src={video.doodEmbedUrl}
            title={communityDisplayTitle(video)}
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="origin"
            className="aspect-video w-full"
          />
        </div>
        {video.adult && (
          <p className="flex items-center gap-2 text-xs text-red-300">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            18+
          </p>
        )}
      </div>
    </div>
  );
}
