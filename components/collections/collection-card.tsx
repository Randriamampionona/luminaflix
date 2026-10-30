import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { CollectionCardData } from "@/action/get-collections.action";
import { tmdbImage } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Wide card for a collection / franchise: backdrop, emoji, title, number of titles. */
export function CollectionCard({
  card,
  countLabel,
  className,
}: {
  card: CollectionCardData;
  countLabel?: string;
  className?: string;
}) {
  const image = tmdbImage(card.backdrop);
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative block aspect-[16/9] overflow-hidden rounded-3xl border border-line bg-elevated shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
        className,
      )}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 80vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-2xl leading-none" aria-hidden>
            {card.emoji}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base leading-tight font-black tracking-tight text-white sm:text-lg">
            {card.title}
          </h3>
          {(countLabel || card.tagline) && (
            <p className="mt-1 line-clamp-1 text-[11px] text-zinc-300">{countLabel ?? card.tagline}</p>
          )}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors group-hover:bg-cyan-500 group-hover:text-black">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** Horizontal, swipeable list of collection cards (home page, search results). */
export function CollectionStrip({ cards, countLabel }: { cards: CollectionCardData[]; countLabel: (n: number) => string }) {
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 scrollbar-hide">
      {cards.map((card) => (
        <CollectionCard
          key={card.href}
          card={card}
          countLabel={card.count ? countLabel(card.count) : undefined}
          className="w-[78vw] shrink-0 snap-start sm:w-[22rem]"
        />
      ))}
    </div>
  );
}
