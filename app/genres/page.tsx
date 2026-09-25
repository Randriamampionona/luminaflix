import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Hash } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllGenres } from "@/action/get-all-genres.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { tmdbImage } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("genres") };
}

export default async function AllGenresPage() {
  const [t, genres] = await Promise.all([getTranslations("pages.genres"), getAllGenres()]);

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} meta={t("total", { count: genres.length })} />

      <div className="media-grid grid grid-cols-1 border-t border-l border-white/5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {genres.map((genre, index) => {
          const backdrop = tmdbImage(genre.backdrop);
          return (
            <Link
              key={genre.id}
              href={`/genres/${genre.id}`}
              className="group relative flex aspect-video flex-col justify-between overflow-hidden border-r border-b border-white/5 bg-zinc-950 p-6 transition-all duration-700 sm:p-8 md:aspect-square"
            >
              {backdrop && (
                <div className="absolute inset-0">
                  <Image
                    src={backdrop}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-20 grayscale transition-all duration-1000 ease-out group-hover:scale-110 group-hover:opacity-40 group-hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-black/60 transition-colors duration-700 group-hover:bg-black/20" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
                </div>
              )}

              <div className="relative flex items-start justify-between">
                <span className="flex items-center gap-2">
                  <Hash className="h-3 w-3 text-cyan-500 opacity-50" aria-hidden />
                  <span className="font-mono text-[10px] text-zinc-500 transition-colors group-hover:text-cyan-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition-all duration-500 group-hover:border-cyan-500 group-hover:bg-cyan-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-black" />
                </span>
              </div>

              <div className="relative">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 transition-colors group-hover:text-cyan-400">
                  {t("explore")}
                </span>
                <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter wrap-break-word transition-transform duration-500 group-hover:translate-x-2 sm:text-4xl">
                  {genre.name}
                </h2>
              </div>

              <span className="absolute bottom-0 left-0 h-1 w-full -translate-x-full bg-cyan-500 transition-transform duration-700 ease-in-out group-hover:translate-x-0" />
            </Link>
          );
        })}
      </div>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
