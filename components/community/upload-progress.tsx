"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatBytes, formatDuration } from "@/lib/community/format";
import type { UploadState } from "@/lib/community/upload-store";
import { cn } from "@/lib/utils";

/** 0–100 for the current step (sending pieces, then server → upload server). */
export function uploadPercent(upload: UploadState) {
  if (upload.status === "uploading") return upload.progress;
  if (upload.status === "transferring") return Math.min(100, Math.floor((upload.transferred / upload.size) * 100));
  if (upload.status === "uploaded") return 100;
  return 0;
}

/**
 * Progress bar + status line + "sent / total · speed · time left", shared by the
 * upload page and the floating widget.
 */
export default function UploadProgress({
  upload,
  maxGb,
  compact = false,
}: {
  upload: UploadState;
  maxGb: number;
  compact?: boolean;
}) {
  const t = useTranslations("community.upload");
  const fr = useLocale().startsWith("fr");
  if (upload.status === "idle") return null;

  if (upload.status === "error" || upload.status === "interrupted") {
    const message =
      upload.status === "interrupted"
        ? t("interruptedBody")
        : upload.code === "TOO_LARGE"
          ? t("tooLarge", { max: maxGb })
          : upload.code === "NOT_VIDEO"
            ? t("notVideo")
            : upload.code === "RATE_LIMITED"
              ? t("rateLimited")
              : upload.code === "TRANSFER_FAILED"
                ? t("transferFailed")
                : t("uploadFailed");
    return (
      <p className={cn("flex items-start gap-2 font-bold text-red-500", compact ? "text-[11px]" : "text-xs")}>
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          {upload.status === "interrupted" && <span className="block">{t("interruptedTitle")}</span>}
          <span className={cn(upload.status === "interrupted" && "font-medium text-fg-muted")}>{message}</span>
        </span>
      </p>
    );
  }

  if (upload.status === "uploaded") {
    return (
      <p
        className={cn(
          "flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        {upload.file.canPlay ? t("ready") : t("uploaded")}
      </p>
    );
  }

  const percent = uploadPercent(upload);
  const transferring = upload.status === "transferring";
  const done = transferring ? upload.transferred : upload.sent;
  const speed = upload.speed;
  const left = transferring ? (speed && speed > 0 ? (upload.size - upload.transferred) / speed : null) : upload.eta;
  const waitingServer = transferring && upload.transferred >= upload.size;

  return (
    <div className="space-y-2">
      <div className={cn("overflow-hidden rounded-full bg-tint-strong", compact ? "h-1.5" : "h-2.5")}>
        {transferring && upload.transferred === 0 ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
        ) : (
          <div
            className={cn("h-full rounded-full transition-all", transferring ? "bg-violet-500" : "bg-cyan-500")}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
      <p className={cn("flex items-center gap-2 font-bold text-fg-soft", compact ? "text-[11px]" : "text-xs")}>
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        {waitingServer
          ? t("serverSaving")
          : transferring
            ? t("transferringPercent", { percent })
            : t("uploading", { percent })}
      </p>
      {!waitingServer && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-fg-subtle">
          <span>
            {formatBytes(done, fr)} / {formatBytes(upload.size, fr)}
          </span>
          <span aria-hidden>·</span>
          <span className={cn("font-bold", transferring ? "text-violet-500 dark:text-violet-300" : "text-brand")}>
            {speed !== null ? `${formatBytes(speed, fr)}/s` : t("measuring")}
          </span>
          {left !== null && (
            <>
              <span aria-hidden>·</span>
              <span>{t("timeLeft", { time: formatDuration(left) })}</span>
            </>
          )}
        </p>
      )}
      {transferring && !compact && <p className="text-[11px] text-fg-muted">{t("transferHint")}</p>}
    </div>
  );
}
