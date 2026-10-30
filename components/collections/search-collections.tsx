import { Layers } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { searchCollections } from "@/action/get-collections.action";
import { CollectionStrip } from "./collection-card";

/** Search results: franchises / collections matching the query (e.g. "harry potter" → the saga). */
export default async function SearchCollections({ query }: { query: string }) {
  const [t, cards] = await Promise.all([getTranslations("collections"), searchCollections(query)]);
  if (cards.length === 0) return null;
  return (
    <section className="space-y-3" aria-label={t("inSearch")}>
      <h2 className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] text-fg-muted uppercase">
        <Layers className="h-3.5 w-3.5 text-brand" aria-hidden />
        {t("inSearch")}
      </h2>
      <CollectionStrip cards={cards} countLabel={(count) => t("count", { count })} />
    </section>
  );
}
