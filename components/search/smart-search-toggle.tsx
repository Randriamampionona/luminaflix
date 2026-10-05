"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSmartSearch } from "@/hooks/use-smart-search";
import { cn } from "@/lib/utils";

/** "AI" switch shown next to the search inputs. */
export default function SmartSearchToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const t = useTranslations("search.smart");
  const { enabled, setEnabled } = useSmartSearch();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={t("label")}
      title={enabled ? t("on") : t("off")}
      onClick={() => setEnabled(!enabled)}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
        compact ? "h-8 w-8 justify-center" : "px-3 py-1.5",
        enabled
          ? "border-cyan-500/40 bg-cyan-500/15 text-brand"
          : "border-line-strong bg-tint text-fg-subtle hover:text-foreground",
        className,
      )}
    >
      <Sparkles className={cn("h-3.5 w-3.5", enabled && "fill-current")} aria-hidden />
      {!compact && <span>{t("label")}</span>}
    </button>
  );
}