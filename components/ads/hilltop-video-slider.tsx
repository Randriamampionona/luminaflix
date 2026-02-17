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
            s.src = "//softtemperature.com/bjXBV/s.dLGql/0IYiWacc/LeMmD9UuvZbUVlXkvPaTyYL4/MlDbkw1TNkj/kItFN/j/gxwuOFTQU-3SMNw-";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
