"use client";

import AdsterraNativeBanner from "./adsterra-native-banner";

/** The ad shown inside <AdWrapper> on every page: Adsterra Native Banner. */
const NativeBannerAd = () => {
  return (
    <div className="flex w-full min-h-25 items-center justify-center overflow-hidden">
      <AdsterraNativeBanner />
    </div>
  );
};

export default NativeBannerAd;
