"use client";

import { CheckCircle2, Clock, Film, ImagePlus, Info, Loader2, RefreshCw, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import UploadProgress from "@/components/community/upload-progress";
import { useCommunityUpload } from "@/hooks/use-community-upload";
import { formatBytes } from "@/lib/community/format";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_GENRES,
  COMMUNITY_LANGUAGES,
  communityWatchHref,
  isEpisodic,
  type CommunityGenre,
} from "@/lib/community/types";
import {
  cancelUpload,
  resumeUpload,
  setDraft,
  startAnother,
  startUpload,
  submitForReview,
  type DraftError,
} from "@/lib/community/upload-store";
import { cn } from "@/lib/utils";

const SEASONS = Array.from({ length: 30 }, (_, i) => i + 1);
const EPISODES = Array.from({ length: 200 }, (_, i) => i + 1);

/** Poster → 400×600 WebP (JPEG where WebP can't be encoded), cropped to fill. */
async function resizePoster(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(400 / bitmap.width, 600 / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (400 - w) / 2, (600 - h) / 2, w, h);
  const webp = canvas.toDataURL("image/webp", 0.82);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85);
}

const field =
  "w-full rounded-2xl border border-line-strong bg-tint px-4 py-3 text-sm text-foreground outline-none placeholder:text-fg-faint focus:border-cyan-500/60";
const label = "mb-1.5 block text-[10px] font-black tracking-widest text-fg-subtle uppercase";

/**
 * /community/upload: the video (drag and drop) and its details. The upload itself
 * lives in the app-wide store (lib/community/upload-store.ts): it continues while
 * the member browses elsewhere, and "Submit" can be pressed before it ends.
 */
export default function UploadForm({ maxGb }: { maxGb: number }) {
  const t = useTranslations("community.upload");
  const tc = useTranslations("community");
  const fr = useLocale().startsWith("fr");
  const router = useRouter();
  const { upload, draft, submission } = useCommunityUpload();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<DraftError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const episodic = isEpisodic(draft.category);
  const maxBytes = maxGb * 1024 ** 3;
  const active = upload.status === "uploading" || upload.status === "transferring";

  // "My shares" (server-rendered above the form) lists the new upload.
  const submittedId = submission.status === "submitted" ? submission.id : null;
  useEffect(() => {
    if (submittedId) router.refresh();
  }, [submittedId, router]);

  const pick = (file: File | undefined) => {
    if (file) void startUpload(file, maxBytes);
  };

  const onPoster = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setDraft({ posterData: await resizePoster(file), posterUrl: "" });
    } catch {
      // unreadable image: ignore
    }
  };

  const toggleGenre = (g: CommunityGenre) =>
    setDraft({
      genres: draft.genres.includes(g)
        ? draft.genres.filter((x) => x !== g)
        : draft.genres.length < 4
          ? [...draft.genres, g]
          : draft.genres,
    });

  const submit = () => {
    setError(submitForReview());
  };

  if (submission.status === "submitted" && submission.id) {
    return (
      <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
        <h2 className="text-2xl font-black text-foreground">{t("successTitle")}</h2>
        <p className="text-sm text-fg-muted">{t("successBody", { id: submission.id })}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={startAnother}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-black uppercase hover:bg-cyan-400"
          >
            {t("another")}
          </button>
          <Link
            href={communityWatchHref({ id: submission.id, category: submission.category ?? "movie" })}
            className="rounded-2xl border border-line-strong bg-tint px-5 py-3 text-xs font-black tracking-widest text-fg-soft uppercase hover:text-foreground"
          >
            {tc("widget.watch")}
          </Link>
        </div>
      </div>
    );
  }

  const queued = submission.status === "queued" || submission.status === "submitting";
  const errorText = (code: DraftError | string) =>
    t.has(`errors.${code}` as "errors.FAILED") ? t(`errors.${code}` as "errors.FAILED") : t("errors.FAILED");

  return (
    <div data-no-smartlink className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* 1. The video */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-foreground">{t("videoTitle")}</h2>

        {upload.status === "idle" ||
        upload.status === "interrupted" ||
        (upload.status === "error" && !upload.resumable) ? (
          <>
            {upload.status !== "idle" && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
                <UploadProgress upload={upload} maxGb={maxGb} />
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors",
                dragging ? "border-cyan-500 bg-cyan-500/10" : "border-line-strong bg-tint hover:border-cyan-500/60",
              )}
            >
              <UploadCloud className={cn("h-12 w-12", dragging ? "text-brand" : "text-fg-faint")} aria-hidden />
              <span className="text-base font-black text-foreground">
                {upload.status === "interrupted" ? t("pickAgain") : t("dropTitle")}
              </span>
              <span className="max-w-sm text-xs text-fg-muted">
                {upload.status === "interrupted"
                  ? `${upload.name} · ${formatBytes(upload.size, fr)}`
                  : t("dropBody", { max: maxGb })}
              </span>
            </button>
          </>
        ) : (
          <div className="space-y-4 rounded-3xl border border-line-strong bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-brand">
                <Film className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{"name" in upload ? upload.name : ""}</p>
                <p className="text-xs text-fg-subtle">
                  {"size" in upload && upload.size ? formatBytes(upload.size, fr) : ""}
                </p>
              </div>
              {upload.status === "uploading" && (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t("cancel")}
                </button>
              )}
              {(upload.status === "uploaded" || upload.status === "error") && (
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {t("replace")}
                </button>
              )}
            </div>
            <UploadProgress upload={upload} maxGb={maxGb} />
            {upload.status === "uploaded" && !upload.file.canPlay && (
              <p className="text-xs text-fg-muted">{t("processing")}</p>
            )}
            {upload.status === "error" && upload.resumable && (
              <div className="space-y-2">
                <p className="text-xs text-fg-muted">{t("resumeHint")}</p>
                <button
                  type="button"
                  onClick={() => void resumeUpload()}
                  className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-[10px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {t("resume")}
                </button>
              </div>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.ts"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            pick(file);
          }}
        />

        {/* Poster */}
        <div className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          <p className={label}>
            {t("posterTitle")} <span className="normal-case">({t("optional")})</span>
          </p>
          <div className="flex gap-4">
            <div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-xl border border-line-strong bg-tint">
              {draft.posterData || /^https:\/\//.test(draft.posterUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen poster
                <img src={draft.posterData ?? draft.posterUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="absolute inset-0 m-auto h-6 w-6 text-fg-faint" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-tint px-3 py-2 text-[10px] font-black tracking-widest text-fg-soft uppercase hover:text-foreground">
                <ImagePlus className="h-4 w-4" aria-hidden />
                {t("posterUpload")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPoster(e.target.files?.[0])}
                />
              </label>
              <input
                type="url"
                value={draft.posterUrl}
                onChange={(e) =>
                  setDraft({ posterUrl: e.target.value.trim(), ...(e.target.value ? { posterData: null } : {}) })
                }
                placeholder={t("posterUrl")}
                className={field}
              />
              {(draft.posterData || draft.posterUrl) && (
                <button
                  type="button"
                  onClick={() => setDraft({ posterData: null, posterUrl: "" })}
                  className="text-[10px] font-bold text-fg-subtle hover:text-foreground"
                >
                  {t("posterRemove")}
                </button>
              )}
              <p className="text-[11px] text-fg-subtle">{t("posterHint")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. The details */}
      <section className="space-y-5">
        <h2 className="text-lg font-black text-foreground">{t("infoTitle")}</h2>

        <div>
          <p className={label}>{t("category")}</p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_CATEGORIES.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDraft({ category: key })}
                aria-pressed={draft.category === key}
                className={cn(
                  "rounded-full border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-colors",
                  draft.category === key
                    ? "border-cyan-500 bg-cyan-500 text-black"
                    : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
                )}
              >
                {tc(`category.${key}`)}
              </button>
            ))}
          </div>
        </div>

        {episodic && (
          <>
            <p className="flex gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-xs leading-relaxed text-fg-soft">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              {t("episodicNote")}
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
              <label>
                <span className={label}>{t("seriesTitle")} *</span>
                <input
                  value={draft.seriesTitle}
                  onChange={(e) => setDraft({ seriesTitle: e.target.value })}
                  placeholder={t("seriesPlaceholder")}
                  maxLength={140}
                  className={field}
                />
              </label>
              <label>
                <span className={label}>{t("season")} *</span>
                <select
                  value={draft.season}
                  onChange={(e) => setDraft({ season: Number(e.target.value) })}
                  className={field}
                >
                  {SEASONS.map((n) => (
                    <option key={n} value={n}>
                      S{n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>{t("episode")} *</span>
                <select
                  value={draft.episode}
                  onChange={(e) => setDraft({ episode: Number(e.target.value) })}
                  className={field}
                >
                  {EPISODES.map((n) => (
                    <option key={n} value={n}>
                      E{n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <label className="block">
          <span className={label}>{episodic ? t("episodeTitle") : `${t("movieTitle")} *`}</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            placeholder={t("titlePlaceholder")}
            maxLength={140}
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>{t("description")} *</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ description: e.target.value })}
            placeholder={t("descriptionPlaceholder")}
            rows={4}
            maxLength={2000}
            className={cn(field, "resize-y")}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className={label}>
              {t("year")} <span className="normal-case">({t("optional")})</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={draft.year}
              onChange={(e) => setDraft({ year: e.target.value.slice(0, 4) })}
              placeholder="2026"
              className={field}
            />
          </label>
          <label>
            <span className={label}>
              {t("language")} <span className="normal-case">({t("optional")})</span>
            </span>
            <select value={draft.language} onChange={(e) => setDraft({ language: e.target.value })} className={field}>
              <option value="">—</option>
              {COMMUNITY_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {tc(`languages.${code}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <p className={label}>
            {t("genres")} <span className="normal-case">({t("optional")}, max 4)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                aria-pressed={draft.genres.includes(g)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  draft.genres.includes(g)
                    ? "border-violet-500 bg-violet-500/20 text-foreground"
                    : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
                )}
              >
                {tc(`genres.${g}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={label}>{t("cast")}</span>
          <input
            value={draft.cast}
            onChange={(e) => setDraft({ cast: e.target.value })}
            placeholder={t("castPlaceholder")}
            maxLength={300}
            className={field}
          />
        </label>

        <p className="flex items-center justify-between rounded-2xl border border-line bg-tint px-4 py-3 text-xs">
          <span className="font-black tracking-widest text-fg-subtle uppercase">{t("idLabel")}</span>
          <span className="font-mono text-fg-soft">{t("idValue")}</span>
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500"
          >
            {errorText(error)}
          </p>
        )}
        {submission.status === "failed" && (
          <p
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-500"
          >
            {t("submitFailed")} {errorText(submission.error ?? "FAILED")}
          </p>
        )}

        {queued ? (
          <div className="space-y-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-4">
            <p className="flex gap-2 text-sm font-semibold text-fg-soft">
              {submission.status === "submitting" ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand" aria-hidden />
              ) : (
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              )}
              {t("queuedNote")}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={upload.status === "idle" || upload.status === "interrupted" || upload.status === "error"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 text-sm font-black tracking-widest text-black uppercase shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" aria-hidden />
            {upload.status === "uploaded"
              ? submission.status === "failed"
                ? t("retrySubmit")
                : t("submit")
              : active
                ? t("submitQueued")
                : t("needVideo")}
          </button>
        )}
      </section>
    </div>
  );
}
