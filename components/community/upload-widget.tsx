"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Film, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import UploadProgress, { uploadPercent } from "@/components/community/upload-progress";
import { useCommunityUpload } from "@/hooks/use-community-upload";
import { communityWatchHref, isEpisodic } from "@/lib/community/types";
import { cancelUpload, dismissWidget } from "@/lib/community/upload-store";
import { cn } from "@/lib/utils";

const MAX_GB = Math.round(((Number(process.env.NEXT_PUBLIC_COMMUNITY_MAX_UPLOAD_MB) || 4096) / 1024) * 10) / 10;
const RING = 2 * Math.PI * 22;

/**
 * Floating upload indicator, on every page but /community/upload, while a
 * community upload runs or just finished. Collapsed: a progress ring. Hover or
 * click: a card with the progress, speed, the video's details and where to go next.
 */
export default function UploadWidget() {
  const t = useTranslations("community.widget");
  const tc = useTranslations("community");
  const pathname = usePathname();
  const { upload, draft, submission, dismissed } = useCommunityUpload();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  const visible =
    !dismissed && pathname !== "/community/upload" && (upload.status !== "idle" || submission.status === "submitted");
  if (!visible) return null;

  const open = hovered || pinned;
  const percent = submission.status === "submitted" ? 100 : uploadPercent(upload);
  const running = upload.status === "uploading" || upload.status === "transferring";
  const problem = upload.status === "error" || upload.status === "interrupted" || submission.status === "failed";
  const done = submission.status === "submitted";
  const tone = problem
    ? "text-red-500"
    : done
      ? "text-emerald-500"
      : upload.status === "transferring"
        ? "text-violet-500"
        : "text-cyan-500";

  const title = done
    ? t("submitted")
    : submission.status === "failed"
      ? t("failed")
      : upload.status === "interrupted"
        ? t("interrupted")
        : upload.status === "error"
          ? t("error")
          : upload.status === "uploaded"
            ? submission.status === "queued" || submission.status === "submitting"
              ? t("queued")
              : t("uploaded")
            : upload.status === "transferring"
              ? t("transferring")
              : t("uploading");
  const videoTitle =
    (done
      ? submission.title
      : isEpisodic(draft.category)
        ? draft.seriesTitle && `${draft.seriesTitle} · S${draft.season} E${draft.episode}`
        : draft.title) ||
    ("name" in upload ? upload.name : "") ||
    t("untitled");
  const poster = draft.posterData || (/^https:\/\//.test(draft.posterUrl) ? draft.posterUrl : null);
  const cta =
    done && submission.id
      ? { href: communityWatchHref({ id: submission.id, category: submission.category ?? "movie" }), label: t("watch") }
      : upload.status === "uploaded" && submission.status !== "queued" && submission.status !== "submitting"
        ? { href: "/community/upload", label: t("finish") }
        : { href: "/community/upload", label: t("toUpload") };

  return (
    <div
      data-no-smartlink
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-60"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {open ? (
        <div
          role="dialog"
          aria-label={title}
          className="w-[min(22rem,calc(100vw-2rem))] space-y-4 rounded-3xl border border-line-strong bg-surface/95 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-tint", tone)}>
              {problem ? (
                <AlertTriangle className="h-4 w-4" aria-hidden />
              ) : done ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <UploadCloud className="h-4 w-4" aria-hidden />
              )}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-black text-foreground">
              {title}
              {running && <span className={cn("ml-2 font-mono text-xs", tone)}>{percent} %</span>}
            </p>
            <button
              type="button"
              onClick={() => {
                setPinned(false);
                setHovered(false);
              }}
              aria-label={t("collapse")}
              className="rounded-lg p-1.5 text-fg-muted hover:bg-tint hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
            {!running && (
              <button
                type="button"
                onClick={dismissWidget}
                aria-label={t("close")}
                className="rounded-lg p-1.5 text-fg-muted hover:bg-tint hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {!done && <UploadProgress upload={upload} maxGb={MAX_GB} compact />}
          {done && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-fg-muted">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("pending")} · <span className="font-mono">{submission.id}</span>
            </p>
          )}
          {(submission.status === "queued" || submission.status === "submitting") && running && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-brand">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("waiting")}
            </p>
          )}

          {/* The video being shared */}
          <div className="flex gap-3 rounded-2xl border border-line bg-tint p-3">
            <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-lg border border-line-strong bg-surface">
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element -- poster chosen on the upload page
                <img src={poster} alt="" className="h-full w-full object-cover" />
              ) : (
                <Film className="absolute inset-0 m-auto h-4 w-4 text-fg-faint" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-xs font-black text-foreground">{videoTitle}</p>
              <p className="text-[10px] font-bold tracking-wider text-brand uppercase">
                {tc(`category.${done ? (submission.category ?? draft.category) : draft.category}`)}
                {draft.year && !done ? ` · ${draft.year}` : ""}
              </p>
              {draft.description && !done && (
                <p className="line-clamp-2 text-[11px] text-fg-muted">{draft.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={cta.href}
              onClick={() => {
                setPinned(false);
                setHovered(false);
              }}
              className="flex flex-1 items-center justify-center rounded-xl bg-cyan-500 px-3 py-2.5 text-[10px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
            >
              {cta.label}
            </Link>
            {running && (
              <button
                type="button"
                onClick={cancelUpload}
                className="rounded-xl border border-line-strong px-3 py-2.5 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPinned(true)}
          aria-label={`${t("open")} — ${title}${running ? ` ${percent} %` : ""}`}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-line-strong bg-surface/95 shadow-[0_14px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
        >
          <svg viewBox="0 0 52 52" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="26" cy="26" r="22" fill="none" strokeWidth="4" className="stroke-tint-strong" />
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - (problem ? 1 : percent / 100))}
              className={cn("transition-all duration-500", tone.replace("text-", "stroke-"))}
            />
          </svg>
          {problem ? (
            <AlertTriangle className={cn("h-5 w-5", tone)} aria-hidden />
          ) : done ? (
            <CheckCircle2 className={cn("h-5 w-5", tone)} aria-hidden />
          ) : (
            <span className={cn("font-mono text-[11px] font-black", tone)}>{percent}%</span>
          )}
        </button>
      )}
    </div>
  );
}
