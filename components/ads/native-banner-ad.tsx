"use client";

/** Ad slot shown inside <AdWrapper> (no ad provider plugged in for now). */
const NativeBannerAd = () => {
  return (
    <div className="w-full min-h-25 flex justify-center items-center overflow-hidden text-muted-foreground">
      Ad has been removed to fulfill user&apos;s request.
    </div>
  );
};

export default NativeBannerAd;
