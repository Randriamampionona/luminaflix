"use client";

import Script from "next/script";
import { useEffect } from "react";

/** ExoClick zone (from the ExoClick dashboard). The class name identifies the account's ad slots. */
const EXOCLICK_ZONE_ID = "6075838";
const EXOCLICK_INS_CLASS = "eas6a97888e37";

declare global {
  interface Window {
    AdProvider?: { push: (command: unknown) => void } | unknown[];
  }
}

/**
 * ExoClick ad slot. The provider script loads once for the whole site
 * (next/script de-duplicates it by id), and each slot asks ExoClick to fill it
 * when it appears — also after client-side navigation between pages. Before
 * the script has loaded, `AdProvider` is a plain array that ExoClick reads
 * when it starts.
 */
export default function ExoClickAd({ zoneId = EXOCLICK_ZONE_ID }: { zoneId?: string }) {
  useEffect(() => {
    // Same as ExoClick's snippet: (AdProvider = window.AdProvider || []).push({ serve: {} })
    const provider = (window.AdProvider = window.AdProvider || []);
    provider.push({ serve: {} });
  }, [zoneId]);

  return (
    <>
      <Script id="exoclick-ad-provider" src="https://a.magsrv.com/ad-provider.js" strategy="afterInteractive" />
      <ins className={EXOCLICK_INS_CLASS} data-zoneid={zoneId} />
    </>
  );
}
