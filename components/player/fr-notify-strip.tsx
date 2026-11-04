"use client";

import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import NotifyButton, { type NotifyKind } from "@/components/notify/notify-button";

/**
 * Under the player when the title / episode isn't in French yet (VF / VOSTFR):
 * explains it and offers "Notify me" (e-mail + push as soon as it arrives).
 */
export default function FrNotifyStrip({
  kind,
  id,
  season,
  episode,
  title,
  posterPath,
}: {
  kind: NotifyKind;
  id: string;
  season?: number;
  episode?: number;
  title: string;
  posterPath: string | null;
}) {
  const t = useTranslations("notify");
  const isEpisode = kind !== "movie";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-400/30 bg-linear-to-r from-amber-400/10 via-amber-400/5 to-transparent p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 sm:flex dark:text-amber-300">
        <BellRing className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-black text-foreground">
          {isEpisode ? t("stripTitleEpisode", { season: season ?? 1, episode: episode ?? 1 }) : t("stripTitle")}
        </p>
        <p className="text-xs leading-relaxed text-fg-muted">{t("stripHint")}</p>
      </div>
      <NotifyButton
        kind={kind}
        id={id}
        season={season}
        episode={episode}
        title={title}
        posterPath={posterPath}
        size="lg"
        className="w-full sm:w-auto"
      />
    </div>
  );
}
