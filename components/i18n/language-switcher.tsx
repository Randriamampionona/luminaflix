"use client";

import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { memo, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUserLocale } from "@/i18n/actions";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Replaces the old LanguageSelector, which rewrote `?display_lang=` into
 * every URL (and re-ran a history.replaceState effect on each navigation).
 * The choice is now a cookie; a router refresh re-renders server components
 * — UI strings *and* TMDB data — in the new language.
 */
function LanguageSwitcher({
  align = "end",
  className,
}: {
  align?: "start" | "end";
  className?: string;
}) {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const change = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setUserLocale(next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("change")}
        title={t("current", { language: localeMeta[locale].nativeName })}
        className={cn(
          "flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-white outline-none transition-colors hover:border-cyan-500/40 focus-visible:ring-2 focus-visible:ring-cyan-500/60",
          className,
        )}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-cyan-400" />
        )}
        <span>{localeMeta[locale].short}</span>
        <ChevronDown className="h-3 w-3 text-zinc-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        className="z-100 min-w-40 rounded-2xl border-white/10 bg-[#050505] p-1 shadow-2xl backdrop-blur-3xl"
      >
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onSelect={() => change(code)}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-300 outline-none focus:bg-white focus:text-black"
          >
            <span className="flex items-center gap-3">
              <span className="w-6 text-[10px] font-black text-cyan-500">{localeMeta[code].short}</span>
              {localeMeta[code].nativeName}
            </span>
            {code === locale && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default memo(LanguageSwitcher);
