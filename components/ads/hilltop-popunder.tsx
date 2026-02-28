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
            s.src = "//creamymouth.com/c.DS9n6/bZ2g5tlxSbWtQQ9oN/jZgeyfMAT/MVy-NHSp0/2IODDSIXx/MszHIz5c";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
