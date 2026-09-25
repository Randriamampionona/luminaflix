import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, PlusCircle } from "lucide-react";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getUserFavorites, type FavoritesResult } from "@/action/get-favorites.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import FavoriteCard from "@/components/favorite-card";
import { Await } from "@/components/layout/await";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { InlineSkeleton } from "@/components/layout/skeletons";
import { FavoritesGridSkeleton } from "@/components/skeletons/listing-skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("favorites"), robots: { index: false } };
}

/**
 * The shell (header, ad) renders immediately; the favorites stream in behind
 * a skeleton. Loading favorites means one Firestore read + one TMDB request
 * per title, so it is by far the slowest part of this page.
 */
export default async function FavoritesPage() {
  const t = await getTranslations("pages.favorites");
  const favorites = getUserFavorites(); // not awaited: consumed by two Suspense boundaries

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        accent={t("accent")}
        meta={
          <Suspense fallback={<InlineSkeleton className="w-28" />}>
            <Await promise={favorites}>
              {(data) => (data.error ? null : t("count", { count: data.total_results }))}
            </Await>
          </Suspense>
        }
      />

      <Suspense fallback={<FavoritesGridSkeleton />}>
        <Await promise={favorites}>{(data) => <FavoritesList data={data} />}</Await>
      </Suspense>

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}

async function FavoritesList({ data }: { data: FavoritesResult }) {
  const [t, tCommon] = await Promise.all([getTranslations("pages.favorites"), getTranslations("common")]);

  // BUG FIX: a Firestore failure used to render "Your vault is empty".
  if (data.error) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-8 w-8 text-red-400" />}
        title={t("loadError")}
        action={
          <Link
            href="/favorites"
            className="inline-flex items-center gap-3 rounded-full border border-white/10 px-8 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors hover:border-cyan-500 hover:text-cyan-400"
          >
            {tCommon("retry")}
          </Link>
        }
      />
    );
  }

  if (data.results.length === 0) {
    return (
      <EmptyState
        icon={<PlusCircle className="h-8 w-8" />}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <Link
            href="/movies"
            className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-xs font-black uppercase italic text-black transition-all duration-300 hover:bg-cyan-500 active:scale-95"
          >
            {t("emptyCta")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {data.results.map((item) => (
        <FavoriteCard key={`${item.savedType}-${item.id}-${item.savedSeason}-${item.savedEpisode}`} item={item} />
      ))}
    </div>
  );
}
