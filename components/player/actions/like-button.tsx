"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionCount } from "./action-count";

interface LikeButtonProps {
  active: boolean;
  count: number;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

function LikeButton({ active, count, pending, disabled, onClick }: LikeButtonProps) {
  const t = useTranslations("actions");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={t("like")}
      title={t("like")}
      className={cn(
        "group flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-cyan-400" : "text-zinc-500 hover:text-white",
      )}
    >
      <ThumbsUp
        aria-hidden
        className={cn(
          "h-4 w-4 transition-transform",
          pending && "animate-pulse",
          active ? "scale-110 fill-cyan-400 drop-shadow-[0_0_10px_#06b6d4]" : "group-hover:-translate-y-0.5",
        )}
      />
      <ActionCount value={count} />
    </button>
  );
}

export default memo(LikeButton);
