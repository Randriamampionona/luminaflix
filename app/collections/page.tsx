import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCollectionCards } from "@/action/get-collections.action";
import { CollectionCard } from "@/components/collections/collection-card";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { COLLECTION_GROUPS } from "@/lib/collections";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("collections");
  return { title: t("title"), description: t("description") };
}

/** /collections — every curated collection, by section (best of, sagas, studios, world, moods). */
export default async function CollectionsPage() {
  const [t, cards] = await Promise.all([getTranslations("collections"), getCollectionCards()]);
  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {/* Jump links to each section (swipeable on phones) */}
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide" aria-label={t("title")}>
        {COLLECTION_GROUPS.map((group) => (
          <a
            key={group}
            href={`#${group}`}
            className="shrink-0 rounded-full border border-line-strong bg-tint px-4 py-2 text-[10px] font-black tracking-widest text-fg-muted uppercase transition-colors hover:border-cyan-500/50 hover:text-brand"
          >
            {t(`groups.${group}`)}
          </a>
        ))}
      </nav>
      {COLLECTION_GROUPS.map((group) => {
        const items = cards.filter((c) => c.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group} id={group} className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              {t(`groups.${group}`)}
              <span className="ml-2 text-xs font-bold text-fg-subtle">{items.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {items.map((card) => (
                <CollectionCard key={card.href} card={card} countLabel={t("count", { count: card.count })} />
              ))}
            </div>
          </section>
        );
      })}
    </PageShell>
  );
}
