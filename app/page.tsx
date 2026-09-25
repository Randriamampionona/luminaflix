import { Suspense } from "react";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import HomeCTA from "@/components/home-cta";
import {
  FeaturedSection,
  GenresSection,
  HeroSection,
  LatestRow,
  TopFilmsRow,
  TopTvRow,
} from "@/components/home/home-sections";
import {
  BannerSkeleton,
  GenreTilesSkeleton,
  HeroSkeleton,
  RowSkeleton,
} from "@/components/skeletons/home-skeletons";

/**
 * Streams section by section: each block has a skeleton that matches its
 * final layout, so the page fills in without jumps.
 */
export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-black">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      <div className="relative">
        <Suspense fallback={<RowSkeleton />}>
          <TopFilmsRow />
        </Suspense>

        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>

        <Suspense fallback={<GenreTilesSkeleton />}>
          <GenresSection />
        </Suspense>

        <Suspense fallback={<RowSkeleton />}>
          <TopTvRow />
        </Suspense>

        <Suspense fallback={<BannerSkeleton />}>
          <FeaturedSection />
        </Suspense>

        <HomeCTA />

        <Suspense fallback={<RowSkeleton />}>
          <LatestRow />
        </Suspense>
      </div>
    </main>
  );
}
