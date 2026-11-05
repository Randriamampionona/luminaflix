"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * JuicyAds zones (JuicyAds dashboard → Ad zones). Large screens get the
 * desktop banner, phones and small tablets the mobile one.
 */
const ZONES = {
  desktop: { id: 1130901, width: 908, height: 258 },
  mobile: { id: 1130902, width: 900, height: 112 },
} as const;
const DESKTOP_QUERY = "(min-width: 768px)";

declare global {
  interface Window {
    adsbyjuicy?: { push: (command: unknown) => void } | unknown[];
  }
}

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

/**
 * JuicyAds slot — same as JuicyAds' snippet (jads.js + <ins id=zone> +
 * adsbyjuicy.push), made for the app:
 *  - desktop or mobile zone picked from the screen width (decided in the
 *    browser, so the server never renders the wrong one);
 *  - jads.js loaded once for the whole site (next/script, de-duplicated by id);
 *  - each slot is filled when it appears, also after navigating between pages;
 *  - the banner (908 or 900 px wide) is scaled down to fit narrower screens
 *    instead of being cut off.
 */
export default function JuicyAd() {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => null,
  );
  const zone = isDesktop === null ? null : isDesktop ? ZONES.desktop : ZONES.mobile;
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Fit the banner to the available width.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !zone) return;
    const update = () => setScale(Math.min(1, box.clientWidth / zone.width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, [zone]);

  // Ask JuicyAds to fill this zone (queued until jads.js has loaded).
  useEffect(() => {
    if (!zone) return;
    const queue = (window.adsbyjuicy = window.adsbyjuicy || []);
    queue.push({ adzone: zone.id });
  }, [zone]);

  return (
    <>
      <Script id="juicyads-jads" src="https://poweredby.jads.co/js/jads.js" strategy="afterInteractive" data-cfasync="false" />
      <div
        ref={boxRef}
        className="flex w-full justify-center overflow-hidden"
        style={{ height: zone ? Math.ceil(zone.height * scale) : ZONES.mobile.height }}
      >
        {zone && (
          <div
            key={zone.id}
            className="shrink-0"
            style={{ width: zone.width, height: zone.height, transform: `scale(${scale})`, transformOrigin: "top center" }}
          >
            <ins id={String(zone.id)} data-width={zone.width} data-height={zone.height} />
          </div>
        )}
      </div>
    </>
  );
}
