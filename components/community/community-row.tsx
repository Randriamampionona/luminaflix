"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useRef } from "react";
import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/page-header";
import CommunityCard, { type CommunityCardVideo } from "./community-card";

const ROW_POSTER_SIZES = "(min-width: 768px) 200px, 150px";

/** Same row as "Top rated movies" (components/movie-row.tsx), with community cards. */
export default function CommunityRow({
  title,
  videos,
  viewAllHref = "/community/browse",
}: {
  title: string;
  videos: CommunityCardVideo[];
  viewAllHref?: string | null;
}) {
  const t = useTranslations("common");
  const tc = useTranslations("community");
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback((direction: -1 | 1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.9, behavior: "smooth" });
  }, []);

  if (videos.length === 0) return null;

  return (
    <section className="py-6 sm:py-8" aria-label={title}>
      <Container className="space-y-5">
        <SectionHeader
          title={title}
          action={
            <div className="flex items-center gap-2">
              {viewAllHref && (
                <Link
                  href={viewAllHref}
                  className="mr-1 hidden items-center gap-1.5 text-[10px] font-black tracking-widest text-fg-muted uppercase transition-colors hover:text-brand-bright sm:flex"
                >
                  {tc("viewAll")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={t("scrollLeft")}
                className="rounded-full border border-line bg-elevated p-2 text-foreground transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={t("scrollRight")}
                className="rounded-full border border-line bg-elevated p-2 text-foreground transition-colors hover:bg-cyan-500 hover:text-black"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />
        <div
          ref={rowRef}
          className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-4 scrollbar-hide"
        >
          {videos.map((video) => (
            <div key={video.id} className="w-37.5 shrink-0 snap-start md:w-50">
              <CommunityCard video={video} sizes={ROW_POSTER_SIZES} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
