"use client";

import { useTranslations } from "next-intl";
import { useFrStatus } from "@/lib/fr-status-client";
import { cn } from "@/lib/utils";
import NotifyButton from "./notify-button";

/** VF / VOSTFR availability of a movie, with "Notify me" while it isn't available. */
export default function FrStatusBadge({ id, title, posterPath }: { id: number; title: string; posterPath: string | null }) {
  const t = useTranslations("comingSoon");
  const status = useFrStatus("movie", id, true);
  if (status === undefined) {
    return <span className="inline-block h-8 w-28 animate-pulse rounded-xl bg-tint" aria-label={t("checking")} />;
  }
  const label =
    status === "both" ? "VF · VOSTFR" : status === "vf" || status === "fr" ? "VF" : status === "vostfr" ? "VOSTFR" : null;
  if (label) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[10px] font-black tracking-widest text-emerald-600 uppercase dark:text-emerald-400",
        )}
      >
        ✓ {t("available", { langs: label })}
      </span>
    );
  }
  return <NotifyButton id={id} title={title} posterPath={posterPath} />;
}
