"use client";

import JuicyAd from "./juicy-ad";

/** The ad shown inside <AdWrapper> on every page: JuicyAds (desktop or mobile zone). */
const NativeBannerAd = () => {
  return (
    <div className="flex w-full min-h-25 items-center justify-center overflow-hidden">
      <JuicyAd />
    </div>
  );
};

export default NativeBannerAd;
