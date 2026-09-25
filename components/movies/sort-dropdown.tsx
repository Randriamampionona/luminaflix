"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SORT_OPTIONS, resolveSort, type MediaType } from "@/lib/filters";
import { cn } from "@/lib/utils";

/**
 * BUG FIXES: always pushed to `/movies` (wrong on TV Shows / Library) and
 * offered movie-only sort keys on TV pages. Also migrated from a hand-rolled
 * overlay to Radix for keyboard support and focus management.
 */
export default function SortDropdown({
  mediaType = "movie",
  defaultSort,
}: {
  mediaType?: MediaType;
  defaultSort?: string;
}) {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = resolveSort(searchParams.get("sort") ?? undefined, mediaType, defaultSort);
  const currentOption = SORT_OPTIONS[mediaType].find((option) => option.value === current);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("sortLabel")}
        className="group flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-5 py-2.5 text-zinc-300 outline-none transition-colors hover:border-cyan-500/50 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <span className="text-sm font-bold uppercase tracking-widest">
          {currentOption ? t(`sort.${currentOption.key}`) : t("sortLabel")}
        </span>
        <ArrowUpDown className="h-4 w-4 text-cyan-500 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-100 w-56 rounded-xl border-white/10 bg-zinc-900 p-1 shadow-2xl backdrop-blur-xl">
        <DropdownMenuLabel className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          {t("sortLabel")}
        </DropdownMenuLabel>
        {SORT_OPTIONS[mediaType].map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => handleSort(option.value)}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-sm font-bold outline-none",
              current === option.value ? "bg-cyan-500/5 text-cyan-500" : "text-zinc-400 focus:bg-white/5 focus:text-white",
            )}
          >
            {t(`sort.${option.key}`)}
            {current === option.value && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
