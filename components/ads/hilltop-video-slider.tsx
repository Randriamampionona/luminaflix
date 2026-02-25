"use client";

import Script from "next/script";

export default function HilltopVideoSlider() {
  return (
    <Script
      id="hilltop-video-slider"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(nyhwzs){
            var d = document,
                s = d.createElement('script'),
                l = d.scripts[d.scripts.length - 1];
            s.settings = nyhwzs || {};
            s.src = "//diligentresident.com/b/XaVOs.dGGPll0_YoWccm/Ge/m/9Ru/Z/UJlpk/PUTeYp4/MeDokr1/NRj-kstbN/jCgxwIOsTgU/3bMcwV";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
