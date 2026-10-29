"use client";

import { Check, Copy, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";
import { buildShareHtml, buildShareText, copyShare, trailerUrlFor, type ShareInfo, type ShareLabels } from "./share-text";

const noop = () => () => {};
const getOrigin = () => window.location.origin;
const getCanShare = () => typeof navigator.share === "function";

/**
 * "Share it with your friends" card (players and the admin media page).
 * Copy → clipboard gets the title, type, rating, short description, link,
 * trailer (in the current language) and poster (with emojis; rich version with
 * the image where supported) + a toast.
 * Also: the phone's share sheet when available, WhatsApp and Telegram.
 */
export default function ShareCard({ info, className }: { info: ShareInfo; className?: string }) {
  const t = useTranslations("share");
  const locale = useLocale();
  const origin = useSyncExternalStore(noop, getOrigin, () => process.env.NEXT_PUBLIC_DOMAIN ?? "");
  const canShare = useSyncExternalStore(noop, getCanShare, () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const url = `${origin}${info.path}`;
  const labels: ShareLabels = {
    title: t("lines.title"),
    type: t("lines.type"),
    episode: t("lines.episode"),
    rating: t("lines.rating"),
    description: t("lines.description"),
    link: t("lines.link"),
    poster: t("lines.poster"),
    footer: t("lines.footer"),
    kind: t(`kinds.${info.kind}`),
    seasons: t("lines.seasons"),
    seasonsValue: info.seasons ? t("seasonsValue", { seasons: info.seasons, episodes: info.episodes ?? 0 }) : null,
    allEpisodes: t("lines.allEpisodes"),
    trailer: t("lines.trailer"),
  };
  const trailerUrl = trailerUrlFor(info, origin, locale);
  const text = buildShareText(info, url, labels, origin, trailerUrl);
  const poster = tmdbImage(info.posterPath);

  const copy = async () => {
    const ok = await copyShare(text, buildShareHtml(info, url, labels, origin, trailerUrl));
    if (ok) {
      setCopied(true);
      toast.success(t("toastTitle"), { description: t("toastBody", { title: info.title }) });
    } else {
      toast.error(t("failed"));
    }
  };

  const nativeShare = async () => {
    try {
      // The link goes in `url`, so leave it out of the text.
      await navigator.share({ title: info.title, text: text.replace(/^🔗.*\n?/m, ""), url });
    } catch {
      // cancelled by the user
    }
  };

  const chip =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line-strong bg-tint px-4 py-3 text-[10px] font-black uppercase tracking-widest text-fg-muted transition-colors hover:border-cyan-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500";

  return (
    <section
      aria-labelledby="share-card-title"
      className={cn(
        "relative overflow-hidden rounded-4xl border border-line bg-surface p-5 shadow-2xl sm:p-7",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-5">
          {poster && (
            <div className="relative hidden aspect-2/3 w-20 shrink-0 overflow-hidden rounded-2xl shadow-xl ring-1 ring-line-strong sm:block">
              <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.3em] text-brand uppercase">
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              {t("eyebrow")}
            </p>
            <h2 id="share-card-title" className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              {t("title")}
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted">{t("body")}</p>
            {/* Preview of the link */}
            <button
              type="button"
              onClick={copy}
              title={url}
              className="group mt-1 flex w-full max-w-xl cursor-pointer items-center gap-2 rounded-xl border border-line bg-tint-soft px-3 py-2 text-left transition-colors hover:border-cyan-500/40"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-soft">
                {url.replace(/^https?:\/\//, "")}
              </span>
              <Copy className="h-3.5 w-3.5 shrink-0 text-fg-faint group-hover:text-brand" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:max-w-md lg:w-72">
          <button
            type="button"
            onClick={copy}
            className={cn(
              "col-span-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[11px] font-black tracking-widest uppercase transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40",
              copied
                ? "bg-emerald-500 text-black"
                : "bg-cyan-500 text-black shadow-[0_12px_32px_-12px_rgba(6,182,212,0.9)] hover:bg-cyan-400",
            )}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? t("copied") : t("copy")}
          </button>
          {canShare && (
            <button type="button" onClick={nativeShare} className={cn(chip, "col-span-2")}>
              <Share2 className="h-4 w-4" aria-hidden />
              {t("share")}
            </button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={chip}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.replace(/^🔗.*\n?/m, ""))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={chip}
          >
            <Send className="h-4 w-4" aria-hidden />
            Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
