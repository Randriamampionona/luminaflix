import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCollection } from "@/action/get-collections.action";
import { MediaGrid } from "@/components/layout/media-grid";
import { PageShell } from "@/components/layout/page-shell";
import MovieCard from "@/components/movie-card";
import { inferMediaKind, tmdbImage } from "@/lib/media";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) return { robots: { index: false } };
  const image = tmdbImage(c.backdrop);
  return {
    title: c.title,
    description: c.tagline.slice(0, 160) || undefined,
    openGraph: image ? { images: [{ url: image }] } : undefined,
  };
}

/** /collections/[slug] — a curated collection, or any TMDB franchise as c-<id>. */
export default async function CollectionPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [c, t] = await Promise.all([getCollection(slug), getTranslations("collections")]);
  if (!c || c.items.length === 0) notFound();
  const backdrop = tmdbImage(c.backdrop);

  return (
    <PageShell>
      <header className="relative -mx-4 overflow-hidden rounded-none border-line sm:mx-0 sm:rounded-4xl sm:border">
        {backdrop && (
          <Image src={backdrop} alt="" fill priority sizes="100vw" className="object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
        <div className="relative space-y-3 px-4 pt-24 pb-6 sm:px-10 sm:pt-40 sm:pb-10">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest text-fg-muted uppercase hover:text-brand"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {t("all")}
          </Link>
          <h1 className="text-3xl leading-tight font-black tracking-tight text-foreground sm:text-5xl">
            <span className="mr-2" aria-hidden>
              {c.emoji}
            </span>
            {c.title}
          </h1>
          {c.tagline && <p className="max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">{c.tagline}</p>}
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-fg-subtle">
            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-brand">{t("count", { count: c.items.length })}</span>
            {c.ordered && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1">
                <ListOrdered className="h-3 w-3" aria-hidden />
                {t("inOrder")}
              </span>
            )}
          </p>
        </div>
      </header>

      <MediaGrid>
        {c.items.map((movie, index) => (
          <div key={`${movie.id}-${movie.media_type}`} className="relative empty:hidden">
            {c.ordered && (
              <span className="pointer-events-none absolute top-2 left-2 z-20 flex h-6 min-w-6 items-center justify-center rounded-full bg-black/80 px-1.5 text-[11px] font-black text-white ring-1 ring-cyan-400/70">
                {index + 1}
              </span>
            )}
            <MovieCard movie={movie} type={inferMediaKind(movie)} priority={index < 6} />
          </div>
        ))}
      </MediaGrid>
    </PageShell>
  );
}
