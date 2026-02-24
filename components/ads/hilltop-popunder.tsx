"use client";

import Script from "next/script";

export default function HilltopPopunder() {
  return (
    <Script
      id="hilltop-popunder"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(ltbj){
            var d = document,
                s = d.createElement('script'),
                l = d.scripts[d.scripts.length - 1];
            s.settings = ltbj || {};
            s.src = "//creamymouth.com/coD.9W6EbH2/5ilzShWPQB9NNBjBgLy/M/TaM_yANKSV0X2XOkD/ICxfMMzFIF5p";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
