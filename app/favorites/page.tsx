import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getUserFavorites } from "@/action/get-favorites.action";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import FavoriteCard from "@/components/favorite-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("favorites"), robots: { index: false } };
}

export default async function FavoritesPage() {
  const [t, data] = await Promise.all([getTranslations("pages.favorites"), getUserFavorites()]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        accent={t("accent")}
        meta={t("count", { count: data.total_results })}
      />

      {data.results.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.results.map((item) => (
            <FavoriteCard key={`${item.savedType}-${item.id}-${item.savedSeason}-${item.savedEpisode}`} item={item} />
          ))}
        </div>
      ) : (
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
      )}

      <AdWrapper>
        <NativeBannerAd />
      </AdWrapper>
    </PageShell>
  );
}
