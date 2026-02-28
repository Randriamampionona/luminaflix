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
            s.src = "//diligentresident.com/b/X.VrsrdJG/lU0rYbWdch/Jehmz9SuKZeU_l/kIP/TzYy4VM-jcIy4ZNizNcCt_NXjtg/yyMbjhgE4RM/QI";
            s.async = true;
            s.referrerPolicy = 'no-referrer-when-downgrade';
            l.parentNode.insertBefore(s, l);
          })({})
        `,
      }}
    />
  );
}
