"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { CollectionCardData } from "@/action/get-collections.action";
import { SectionHeader } from "@/components/layout/page-header";
import { CollectionCard } from "./collection-card";

/** Home row of collections: ‹ › buttons (like the movie rows) next to "See all". */
export default function CollectionsCarousel({
  cards,
  eyebrow,
  title,
  seeAll,
}: {
  cards: CollectionCardData[];
  eyebrow: string;
  title: string;
  seeAll: string;
}) {
  const t = useTranslations("common");
  const tc = useTranslations("collections");
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.9, behavior: "smooth" });
  };
  const arrow =
    "rounded-full border border-line bg-elevated p-2 text-foreground transition-colors hover:bg-cyan-500 hover:text-black";

  return (
    <>
      <SectionHeader
        id="home-collections"
        eyebrow={eyebrow}
        title={title}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/collections"
              className="group mr-1 flex items-center gap-2 rounded-2xl border border-line-strong bg-tint px-3 py-2 transition-colors hover:border-cyan-500/50 sm:px-4 sm:py-2.5"
            >
              <span className="text-[10px] font-black tracking-[0.25em] text-fg-muted uppercase group-hover:text-foreground">
                {seeAll}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-fg-muted group-hover:text-brand-bright" />
            </Link>
            <button type="button" onClick={() => scroll(-1)} aria-label={t("scrollLeft")} className={arrow}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scroll(1)} aria-label={t("scrollRight")} className={arrow}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />
      <div ref={rowRef} className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-3 scrollbar-hide">
        {cards.map((card) => (
          <CollectionCard
            key={card.href}
            card={card}
            countLabel={card.count ? tc("count", { count: card.count }) : undefined}
            className="w-[78vw] shrink-0 snap-start sm:w-[22rem]"
          />
        ))}
      </div>
    </>
  );
}
