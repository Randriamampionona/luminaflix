"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getRecommendations } from "@/action/get-recommendations.action";
import MovieRow from "@/components/movie-row";
import { useWatchHistory } from "@/lib/watch-history";
import type { Movie } from "@/typing";

/**
 * Home: "Because you watched X" for the last two titles watched in this browser
 * (nothing at all for a first visit).
 */
export default function BecauseYouWatched() {
  const t = useTranslations("home");
  const history = useWatchHistory();
  const recent = history.slice(0, 2);
  const key = recent.map((w) => `${w.kind}:${w.id}`).join("|");
  const [rows, setRows] = useState<{ key: string; rows: { title: string; items: Movie[] }[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let active = true;
    void Promise.all(
      recent.map(async (w) => ({
        title: w.title,
        items: await getRecommendations(w.kind === "movie" ? "movie" : "tv", w.id).catch(() => [] as Movie[]),
      })),
    ).then((result) => {
      if (active) setRows({ key, rows: result.filter((r) => r.items.length > 0) });
    });
    return () => {
      active = false;
    };
    // `recent` is derived from `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!rows || rows.key !== key) return null;
  return (
    <>
      {rows.rows.map((row) => (
        <MovieRow key={row.title} title={t("becauseYouWatched", { title: row.title })} movies={row.items} />
      ))}
    </>
  );
}
