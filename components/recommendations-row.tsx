import { getTranslations } from "next-intl/server";
import { getRecommendations } from "@/action/get-recommendations.action";
import MovieRow from "@/components/movie-row";

/** "Because you watched X" under the players (TMDB recommendations for the current title). */
export default async function RecommendationsRow({ kind, id, title }: { kind: "movie" | "tv"; id: string; title: string }) {
  const [t, items] = await Promise.all([getTranslations("home"), getRecommendations(kind, id)]);
  if (items.length === 0) return null;
  return <MovieRow title={t("becauseYouWatched", { title })} movies={items} />;
}
