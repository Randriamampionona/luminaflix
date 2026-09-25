"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActionCount } from "./action-count";

interface DislikeButtonProps {
  active: boolean;
  count: number;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

function DislikeButton({ active, count, pending, disabled, onClick }: DislikeButtonProps) {
  const t = useTranslations("actions");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={t("dislike")}
      title={t("dislike")}
      className={cn(
        "group flex h-10 cursor-pointer items-center gap-2 rounded-lg px-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        active ? "text-white" : "text-zinc-500 hover:text-white",
      )}
    >
      <ThumbsDown
        aria-hidden
        className={cn(
          "h-4 w-4 transition-transform",
          pending && "animate-pulse",
          active ? "scale-110 fill-white" : "group-hover:translate-y-0.5",
        )}
      />
      <ActionCount value={count} />
    </button>
  );
}

export default memo(DislikeButton);
