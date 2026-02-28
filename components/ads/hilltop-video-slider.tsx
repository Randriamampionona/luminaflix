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
            s.src = "//diligentresident.com/bdX.VZsFdiGBlt0UYpW/c-/Febmd9UuiZPU/lok/P/T/Ye4AMxD/k/1ZNSjCk/thNmjjgpwPOpThUf3DMHwp";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
