import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCollectionCards } from "@/action/get-collections.action";
import { CollectionCard } from "@/components/collections/collection-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("title"), description: t("description") };
}

/** /collections — franchises and curated lists ("All Marvel in order", "Studio Ghibli"…). */
export default async function CollectionsPage() {
  const [t, cards] = await Promise.all([getTranslations("collections"), getCollectionCards()]);
  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {cards.map((card) => (
          <CollectionCard key={card.href} card={card} countLabel={card.count ? t("count", { count: card.count }) : undefined} />
        ))}
      </div>
    </PageShell>
  );
}
