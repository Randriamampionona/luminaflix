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
            s.src = "//rapid-university.com/b.XjVpsYdWGKlH0BYFWkch/deEmx9tu/ZNU/ldk/PQTqYS4/MHDIkG1jNFj/kRtINzjjgwwiONTtUi3NMPw-";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
