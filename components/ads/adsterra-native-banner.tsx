"use client";

import { useEffect, useRef } from "react";

/** Adsterra Native Banner (Adsterra dashboard → Websites → Get code). */
const AD_KEY = "cd9ecd32fc8f73a4a2f8d17a9af489b6";
const SCRIPT_SRC = `https://brijmohan.org/21/${AD_KEY}`;

/**
 * Adsterra Native Banner — same as Adsterra's snippet:
 *   <script async data-cfasync="false" src=".../21/{key}"></script>
 *   <div id="container-{key}"></div>
 * Adsterra's script fills the container when it runs, so it is added again each
 * time the slot appears (also after navigating between pages — a script written
 * in the page would only run on the first one). Use one slot per page.
 */
export default function AdsterraNativeBanner() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = SCRIPT_SRC;
    script.setAttribute("data-cfasync", "false");
    host.appendChild(script);
    return () => {
      // Leaving the page: remove the script and the ad so the next page starts clean.
      script.remove();
      const container = document.getElementById(`container-${AD_KEY}`);
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div ref={hostRef} className="w-full">
      <div id={`container-${AD_KEY}`} />
    </div>
  );
}
