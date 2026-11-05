import AdWrapper from "./ad-wrapper";
import NativeBannerAd from "./native-banner-ad";

/** The standard ad block of a page ("Advertisement" box with the Adsterra native banner). One per page. */
export default function PageAd({ className }: { className?: string }) {
  return (
    <AdWrapper className={className}>
      <NativeBannerAd />
    </AdWrapper>
  );
}
