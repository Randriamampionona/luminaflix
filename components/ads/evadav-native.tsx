"use client";

import { useEffect, useRef } from "react";

const EvadavNative = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if the script already exists to avoid double-loading
    const scriptId = "evadav-script-tag";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src =
      "https://curoax.com/na/waWQiOjEyMjA5MTUsInNpZCI6MTY1ODI3Mywid2lkIjo3MzQ1MzYsInNyYyI6Mn0=eyJ.js";
    script.async = true;

    // This is the "Modern" way to ensure the script targets
    // the div directly above it in the DOM flow.
    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="evadav-native-placement"
      className="w-full min-h-25 flex justify-center items-center overflow-hidden"
    >
      {/* The script will be injected here by the useEffect, 
          keeping it trapped inside your AdWrapper box. */}
    </div>
  );
};

export default EvadavNative;
