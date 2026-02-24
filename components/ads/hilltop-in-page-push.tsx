"use client";

import Script from "next/script";

export default function HilltopadsInPagePush() {
  return (
    <Script
      id="hilltop-multitag"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          (function(kmqyu){
            var d = document,
                s = d.createElement('script'),
                l = d.scripts[d.scripts.length - 1];
            s.settings = kmqyu || {};
            s.src = "//rapid-university.com/bUX.V/sVdDGRlF0YYcW/cO/Se/mT9NuaZGUDldkNPcTZYz4VMPjHIL4yNEzFc-tzNXjRgJymM/jdg/4XMMQD";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
