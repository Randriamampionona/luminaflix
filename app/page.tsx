import { Suspense } from "react";
import AdWrapper from "@/components/ads/ad-wrapper";
import NativeBannerAd from "@/components/ads/native-banner-ad";
import HomeCTA from "@/components/home-cta";
import BecauseYouWatched from "@/components/home/because-you-watched";
import TopFans from "@/components/badges/top-fans";
import {
  CollectionsSection,
  FeaturedSection,
  GenresSection,
  HeroSection,
  LatestRow,
  TopFilmsRow,
  TopTvRow,
} from "@/components/home/home-sections";
import { BannerSkeleton, GenreTilesSkeleton, HeroSkeleton, RowSkeleton } from "@/components/skeletons/home-skeletons";
import NewUsersBanner from "@/components/new-users-banner";
import { getWelcomeBanner } from "@/action/get-newest-users.action";

/**
 * Streams section by section: each block has a skeleton that matches its
 * final layout, so the page fills in without jumps.
 */
export default async function HomePage() {
  // Cached (refreshed on every sign-up), so this is instant: decided before
  // rendering, the banner never flashes a skeleton when it's hidden.
  const welcome = await getWelcomeBanner();

  return (
    <main className="relative min-h-screen bg-background">
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>

      {/* Shown for 7 days after the latest sign-up: welcome the newest members. */}
      {welcome && <NewUsersBanner users={welcome.users} />}

      <div className="relative">
        <Suspense fallback={<RowSkeleton />}>
          <TopFilmsRow />
        </Suspense>

        <AdWrapper>
          <NativeBannerAd />
        </AdWrapper>

        {/* From this browser's history; nothing on a first visit. */}
        <BecauseYouWatched />

        <Suspense fallback={<GenreTilesSkeleton />}>
          <GenresSection />
        </Suspense>

        <Suspense fallback={<RowSkeleton />}>
          <CollectionsSection />
        </Suspense>

        <Suspense fallback={<RowSkeleton />}>
          <TopTvRow />
        </Suspense>

        <Suspense fallback={<BannerSkeleton />}>
          <FeaturedSection />
        </Suspense>

        <HomeCTA />

        <Suspense fallback={null}>
          <TopFans />
        </Suspense>

        <Suspense fallback={<RowSkeleton />}>
          <LatestRow />
        </Suspense>
      </div>
    </main>
  );
}
