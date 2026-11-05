"use client";

import ExoClickAd from "./exoclick-ad";

/** The ad shown inside <AdWrapper> on every page: the ExoClick slot. */
const NativeBannerAd = () => {
  return (
    <div className="flex w-full min-h-25 items-center justify-center overflow-hidden">
      <ExoClickAd />
    </div>
  );
};

export default NativeBannerAd;
