"use client";

import { CheckCircle2, Film, ImagePlus, Info, Loader2, RefreshCw, UploadCloud, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { submitCommunityVideo } from "@/action/community.action";
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_GENRES,
  COMMUNITY_LANGUAGES,
  isEpisodic,
  type CommunityCategory,
  type CommunityGenre,
} from "@/lib/community/types";
import { cn } from "@/lib/utils";

interface DoodFile {
  fileCode: string;
  embedUrl: string;
  thumbnail: string | null;
  durationSec: number | null;
  canPlay: boolean;
}

type Upload =
  | { status: "idle" }
  | { status: "uploading"; name: string; size: number; progress: number }
  | { status: "uploaded"; name: string; size: number; file: DoodFile }
  | { status: "error"; message: string };

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v|ts|mpg|mpeg|3gp)$/i;
const SEASONS = Array.from({ length: 30 }, (_, i) => i + 1);
const EPISODES = Array.from({ length: 200 }, (_, i) => i + 1);
const formatSize = (bytes: number, fr: boolean) =>
  bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} ${fr ? "Go" : "GB"}`
    : `${Math.round(bytes / 1024 ** 2)} ${fr ? "Mo" : "MB"}`;

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
 * /community/upload: drag-and-drop video → sent to DoodStream through
 * /api/community/upload (with progress), then the details, then "Submit for review".
 */
export default function UploadForm({ maxGb }: { maxGb: number }) {
  const t = useTranslations("community.upload");
  const tc = useTranslations("community");
  const fr = useLocale().startsWith("fr");
  const [upload, setUpload] = useState<Upload>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  /** Title guessed from the file name (cleared if the upload turns out to be an episode). */
  const autoTitle = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<CommunityCategory>("movie");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [language, setLanguage] = useState("");
  const [genres, setGenres] = useState<CommunityGenre[]>([]);
  const [cast, setCast] = useState("");
  const [posterData, setPosterData] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const episodic = isEpisodic(category);

  // Leaving the page cancels an upload in progress: warn first.
  useEffect(() => {
    if (upload.status !== "uploading") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [upload.status]);

  // DoodStream encodes the video after the upload: check every 15 s until it's playable.
  const uploadedCode = upload.status === "uploaded" && !upload.file.canPlay ? upload.file.fileCode : null;
  useEffect(() => {
    if (!uploadedCode) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      if (tries > 60) return clearInterval(timer);
      try {
        const res = await fetch(`/api/community/dood/${uploadedCode}`, { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; file?: DoodFile };
        if (data.ok && data.file?.canPlay) {
          setUpload((u) => (u.status === "uploaded" ? { ...u, file: { ...u.file, ...data.file! } } : u));
          clearInterval(timer);
        }
      } catch {
        // try again on the next tick
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [uploadedCode]);

  const start = (file: File) => {
    if (!file.type.startsWith("video/") && !VIDEO_EXT.test(file.name)) {
      return setUpload({ status: "error", message: t("notVideo") });
    }
    if (file.size > maxGb * 1024 ** 3) return setUpload({ status: "error", message: t("tooLarge", { max: maxGb }) });

    const form = new FormData();
    form.append("file", file, file.name);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setUpload({ status: "uploading", name: file.name, size: file.size, progress: 0 });
    if (!title && !episodic) {
      autoTitle.current = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[._]+/g, " ")
        .trim()
        .slice(0, 140);
      setTitle(autoTitle.current);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUpload((u) => (u.status === "uploading" ? { ...u, progress: Math.round((e.loaded / e.total) * 100) } : u));
      }
    };
    xhr.onload = () => {
      xhrRef.current = null;
      try {
        const data = JSON.parse(xhr.responseText) as { ok: boolean; file?: DoodFile; error?: string };
        if (xhr.status === 200 && data.ok && data.file) {
          setUpload({ status: "uploaded", name: file.name, size: file.size, file: data.file });
        } else {
          setUpload({
            status: "error",
            message: data.error === "TOO_LARGE" ? t("tooLarge", { max: maxGb }) : t("uploadFailed"),
          });
        }
      } catch {
        setUpload({ status: "error", message: t("uploadFailed") });
      }
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      setUpload({ status: "error", message: t("uploadFailed") });
    };
    xhr.open("POST", "/api/community/upload");
    xhr.send(form);
  };

  const cancel = () => {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUpload({ status: "idle" });
  };

  const onPoster = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      setPosterData(await resizePoster(file));
      setPosterUrl("");
    } catch {
      setError(t("errors.POSTER_FILE"));
    }
  };

  const toggleGenre = (g: CommunityGenre) =>
    setGenres((list) => (list.includes(g) ? list.filter((x) => x !== g) : list.length < 4 ? [...list, g] : list));

  const ready = upload.status === "uploaded";
  const submit = () => {
    setError(null);
    if (!ready) return setError(t("needVideo"));
    startSubmit(async () => {
      const result = await submitCommunityVideo({
        category,
        title,
        seriesTitle,
        season,
        episode,
        description,
        year: year ? Number(year) : null,
        genres,
        language: language || null,
        cast: cast || null,
        posterUrl: posterUrl || null,
        posterData,
        doodFileCode: upload.file.fileCode,
      });
      if (result.ok) {
        setDoneId(result.id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(
          t.has(`errors.${result.error}` as "errors.FAILED")
            ? t(`errors.${result.error}` as "errors.FAILED")
            : t("errors.FAILED"),
        );
      }
    });
  };

  const reset = () => {
    setDoneId(null);
    setUpload({ status: "idle" });
    setTitle("");
    setDescription("");
    setPosterData(null);
    setPosterUrl("");
    setEpisode((e) => Math.min(e + 1, 200));
  };

  if (doneId) {
    return (
      <div className="mx-auto max-w-xl space-y-5 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
        <h2 className="text-2xl font-black text-foreground">{t("successTitle")}</h2>
        <p className="text-sm text-fg-muted">{t("successBody", { id: doneId })}</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-xs font-black tracking-widest text-black uppercase hover:bg-cyan-400"
          >
            {t("another")}
          </button>
          <Link
            href="/community/browse"
            className="rounded-2xl border border-line-strong bg-tint px-5 py-3 text-xs font-black tracking-widest text-fg-soft uppercase hover:text-foreground"
          >
            {t("toLibrary")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-no-smartlink className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* 1. The video */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-foreground">{t("videoTitle")}</h2>
        {upload.status === "idle" || upload.status === "error" ? (
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
              const file = e.dataTransfer.files?.[0];
              if (file) start(file);
            }}
            className={cn(
              "flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors",
              dragging ? "border-cyan-500 bg-cyan-500/10" : "border-line-strong bg-tint hover:border-cyan-500/60",
            )}
          >
            <UploadCloud className={cn("h-12 w-12", dragging ? "text-brand" : "text-fg-faint")} aria-hidden />
            <span className="text-base font-black text-foreground">{t("dropTitle")}</span>
            <span className="max-w-sm text-xs text-fg-muted">{t("dropBody", { max: maxGb })}</span>
            {upload.status === "error" && <span className="text-xs font-bold text-red-500">{upload.message}</span>}
          </button>
        ) : (
          <div className="space-y-4 rounded-3xl border border-line-strong bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-brand">
                <Film className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{upload.name}</p>
                <p className="text-xs text-fg-subtle">{formatSize(upload.size, fr)}</p>
              </div>
              {upload.status === "uploading" ? (
                <button
                  type="button"
                  onClick={cancel}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t("cancel")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUpload({ status: "idle" })}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong px-3 py-2 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  {t("replace")}
                </button>
              )}
            </div>
            {upload.status === "uploading" ? (
              <div className="space-y-2">
                <div className="h-2.5 overflow-hidden rounded-full bg-tint-strong">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <p className="flex items-center gap-2 text-xs font-bold text-fg-soft">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {t("uploading", { percent: upload.progress })}
                </p>
              </div>
            ) : (
              <div className="space-y-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                <p className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  {upload.file.canPlay ? t("ready") : t("uploaded")}
                </p>
                {!upload.file.canPlay && <p className="text-fg-muted">{t("processing")}</p>}
                <p className="font-mono text-[10px] text-fg-subtle">DoodStream · {upload.file.fileCode}</p>
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
            if (file) start(file);
          }}
        />

        {/* Poster */}
        <div className="space-y-3 rounded-3xl border border-line bg-surface p-5">
          <p className={label}>
            {t("posterTitle")} <span className="normal-case">({t("optional")})</span>
          </p>
          <div className="flex gap-4">
            <div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-xl border border-line-strong bg-tint">
              {posterData || /^https:\/\//.test(posterUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen poster
                <img src={posterData ?? posterUrl} alt="" className="h-full w-full object-cover" />
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
                value={posterUrl}
                onChange={(e) => {
                  setPosterUrl(e.target.value.trim());
                  if (e.target.value) setPosterData(null);
                }}
                placeholder={t("posterUrl")}
                className={field}
              />
              {(posterData || posterUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setPosterData(null);
                    setPosterUrl("");
                  }}
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
                onClick={() => {
                  setCategory(key);
                  // An episode's title is optional: drop the one guessed from the file name.
                  if (isEpisodic(key) && autoTitle.current && title === autoTitle.current) setTitle("");
                }}
                aria-pressed={category === key}
                className={cn(
                  "rounded-full border px-4 py-2 text-[10px] font-black tracking-widest uppercase transition-colors",
                  category === key
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
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  placeholder={t("seriesPlaceholder")}
                  maxLength={140}
                  className={field}
                />
              </label>
              <label>
                <span className={label}>{t("season")} *</span>
                <select value={season} onChange={(e) => setSeason(Number(e.target.value))} className={field}>
                  {SEASONS.map((n) => (
                    <option key={n} value={n}>
                      S{n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>{t("episode")} *</span>
                <select value={episode} onChange={(e) => setEpisode(Number(e.target.value))} className={field}>
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            maxLength={140}
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>{t("description")} *</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
              value={year}
              onChange={(e) => setYear(e.target.value.slice(0, 4))}
              placeholder="2026"
              className={field}
            />
          </label>
          <label>
            <span className={label}>
              {t("language")} <span className="normal-case">({t("optional")})</span>
            </span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={field}>
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
                aria-pressed={genres.includes(g)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  genres.includes(g)
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
            value={cast}
            onChange={(e) => setCast(e.target.value)}
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
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !ready}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 text-sm font-black tracking-widest text-black uppercase shadow-[0_14px_40px_-12px_rgba(6,182,212,0.8)] transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UploadCloud className="h-4 w-4" aria-hidden />
          )}
          {submitting ? t("submitting") : ready ? t("submit") : t("needVideo")}
        </button>
      </section>
    </div>
  );
}
