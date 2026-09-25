"use client";

import { ListFilter, RotateCcw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GENRE_OPTIONS, YEAR_OPTIONS, type MediaType } from "@/lib/filters";
import { cn } from "@/lib/utils";

const chip = (active: boolean) =>
  cn(
    "rounded-xl border px-4 py-2 text-[11px] font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500",
    active
      ? "border-cyan-400 bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      : "border-white/5 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white",
  );

/**
 * BUG FIXES:
 * - Applying/resetting always navigated to `/movies`, so filtering on TV
 *   Shows, Library or New & Popular jumped to another page. Uses the current
 *   pathname now.
 * - TV and movie genre IDs differ (e.g. TV has no 28 "Action"): the list is
 *   chosen per media type.
 * - "Older" was sent raw to TMDB; it's now translated to a date filter
 *   server-side (see lib/tmdb.ts#yearParams).
 * - Draft selection re-syncs with the URL every time the dialog opens.
 */
export default function AdvancedFilter({
  mediaType = "movie",
  showYear = true,
}: {
  mediaType?: MediaType;
  showYear?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState("all");
  const [year, setYear] = useState("all");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setGenre(searchParams.get("genre") ?? "all");
      setYear((searchParams.get("year") ?? "all").toLowerCase());
    }
    setOpen(next);
  };

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of [["genre", genre], ["year", year]] as const) {
      if (value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    ["genre", "year", "page"].forEach((key) => params.delete(key));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  };

  const activeCount = ["genre", "year"].filter((key) => {
    const value = searchParams.get(key);
    return value && value.toLowerCase() !== "all";
  }).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 shadow-xl outline-none transition-colors hover:border-cyan-500/50 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <ListFilter className="h-4 w-4 text-cyan-500" />
          {t("filters.button")}
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[10px] font-black text-black">
              {activeCount}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="z-100 rounded-md border-white/10 bg-zinc-950/95 p-8 shadow-2xl ring-1 ring-white/5 backdrop-blur-2xl sm:max-w-md">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
            {t("filters.title")}
            <span className="text-cyan-500">.</span>
          </DialogTitle>
          <DialogDescription className="sr-only">{t("filters.emptyBody")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <fieldset>
            <legend className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
              {t("filters.genres")}
            </legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={genre === "all"} onClick={() => setGenre("all")} className={chip(genre === "all")}>
                {t("filters.allGenres")}
              </button>
              {GENRE_OPTIONS[mediaType].map((id) => (
                <button key={id} type="button" aria-pressed={genre === id} onClick={() => setGenre(id)} className={chip(genre === id)}>
                  {t(`genres.g${id}` as "genres.g28")}
                </button>
              ))}
            </div>
          </fieldset>

          {showYear && (
            <fieldset>
              <legend className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                {t("filters.year")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {["all", ...YEAR_OPTIONS, "older"].map((value) => (
                  <button key={value} type="button" aria-pressed={year === value} onClick={() => setYear(value)} className={chip(year === value)}>
                    {value === "all" ? t("filters.allYears") : value === "older" ? t("filters.older") : value}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <div className="mt-10 flex gap-3">
          <button
            type="button"
            onClick={reset}
            aria-label={t("filters.reset")}
            title={t("filters.reset")}
            className="rounded-2xl border border-white/5 bg-zinc-900 p-4 text-zinc-500 transition-colors hover:text-white active:scale-90"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-2xl bg-white py-4 text-xs font-black uppercase tracking-widest text-black shadow-lg transition-colors hover:bg-cyan-500 hover:text-white active:scale-95"
          >
            {t("filters.apply")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
