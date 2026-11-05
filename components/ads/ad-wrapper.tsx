"use client";

import React, { useEffect, useRef } from "react";

// Add global declaration for window.AdProvider
declare global {
  interface Window {
    AdProvider?: Array<Record<string, unknown>>;
  }
}

interface AdWrapperProps {
  className?: string;
}

const AdWrapper = ({ className = "" }: AdWrapperProps) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (adContainerRef.current) {
      // Check if script is already injected in this wrapper instance
      const existingScript = adContainerRef.current.querySelector("script[src*='magsrv.com']");
      if (!existingScript) {
        const script = document.createElement("script");
        script.async = true;
        script.type = "application/javascript";
        script.src = "https://a.magsrv.com/ad-provider.js";
        adContainerRef.current.appendChild(script);
      }

      try {
        window.AdProvider = window.AdProvider || [];
        window.AdProvider.push({ serve: {} });
      } catch (e) {
        console.error("ExoClick banner initialization error:", e);
      }
    }
  }, []);

  return (
    <div className={`my-12 w-full max-w-5xl mx-auto px-4 ${className}`}>
      {/* HEADER BAR */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-px grow bg-linear-to-r from-transparent via-line to-line-strong"></div>

        <div className="flex items-center gap-2">
          {/* THE "PRO" DOT INDICATOR */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fg-subtle">
            Advertisement
          </span>
        </div>

        <div className="h-px grow bg-linear-to-l from-transparent via-line to-line-strong"></div>
      </div>

      {/* AD CONTENT AREA */}
      <div className="relative group">
        {/* CORNER ACCENTS (MODERN TECH LOOK) */}
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#06b6d4]/30 group-hover:border-[#06b6d4] transition-colors"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#06b6d4]/30 group-hover:border-[#06b6d4] transition-colors"></div>

        <div 
          ref={adContainerRef}
          className="bg-tint-soft border border-line-strong rounded-xl overflow-hidden backdrop-blur-sm min-h-25 flex items-center justify-center p-4 transition-all hover:border-line-stronger"
        >
          {/* ExoClick Ins Element Tag */}
          <ins 
            className="eas6a97888e37" 
            data-zoneid="6075838" 
            data-ex-av="name"
          />
        </div>
      </div>

      {/* SUBTLE FOOTER TAG */}
      <p className="mt-2 text-[9px] text-fg-faint text-right font-mono italic opacity-50 uppercase tracking-tighter">
        Lumina_Ads_v2.0 // encrypted_stream
      </p>
    </div>
  );
};

export default AdWrapper;