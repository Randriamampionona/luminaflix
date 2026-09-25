"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  active: boolean;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

function FavoriteButton({ active, pending, disabled, onClick }: FavoriteButtonProps) {
  const t = useTranslations("actions");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group relative flex h-12 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-6 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60",
        pending && "animate-pulse",
        active
          ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.3)]"
          : "border-white/5 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white",
      )}
    >
      {active ? (
        <BookmarkCheck className="h-5 w-5 stroke-[2.5px] animate-in zoom-in duration-300" aria-hidden />
      ) : (
        <Bookmark className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" aria-hidden />
      )}
      <span className="text-[10px] font-black uppercase italic tracking-[0.2em]">
        {active ? t("inFavorites") : t("addFavorite")}
      </span>
    </button>
  );
}

export default memo(FavoriteButton);
