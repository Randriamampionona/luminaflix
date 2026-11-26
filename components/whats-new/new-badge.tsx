"use client";

import { useTranslations } from "next-intl";
import { useIsNewFeature } from "@/lib/whats-new";
import { cn } from "@/lib/utils";

/**
 * Glowing "NEW" pill for a feature (lib/whats-new.ts). Shows only while the
 * feature is new for this visitor; renders nothing otherwise.
 */
export default function NewBadge({ feature, className }: { feature: string | undefined; className?: string }) {
  const t = useTranslations("whatsNew");
  const isNew = useIsNewFeature(feature);
  if (!isNew) return null;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full bg-linear-to-r from-fuchsia-500 to-orange-400 px-1.5 py-0.5 text-[8px] leading-none font-black tracking-wider text-white not-italic shadow-[0_0_14px_rgba(217,70,239,0.75)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-fuchsia-500/60 motion-safe:animate-ping motion-safe:[animation-duration:2s]"
      />
      <span className="relative">{t("badge")}</span>
    </span>
  );
}

/** Small glowing dot (a menu that contains something new). */
export function NewDot({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span aria-hidden className={cn("absolute flex h-2.5 w-2.5", className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-500 opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fuchsia-500 ring-2 ring-background" />
    </span>
  );
}
