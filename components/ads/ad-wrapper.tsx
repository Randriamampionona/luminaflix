import React from "react";

interface AdWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const AdWrapper = ({ children, className = "" }: AdWrapperProps) => {
  return (
    <div className={`my-12 w-full max-w-5xl mx-auto px-4 ${className}`}>
      {/* HEADER BAR */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-px grow bg-linear-to-r from-transparent via-[#161b22] to-[#1e293b]"></div>

        <div className="flex items-center gap-2">
          {/* THE "PRO" DOT INDICATOR */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#64748b]">
            Advertisement
          </span>
        </div>

        <div className="h-px grow bg-linear-to-l from-transparent via-[#161b22] to-[#1e293b]"></div>
      </div>

      {/* AD CONTENT AREA */}
      <div className="relative group">
        {/* CORNER ACCENTS (MODERN TECH LOOK) */}
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#06b6d4]/30 group-hover:border-[#06b6d4] transition-colors"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#06b6d4]/30 group-hover:border-[#06b6d4] transition-colors"></div>

        <div className="bg-[#0f172a]/30 border border-[#1e293b] rounded-xl overflow-hidden backdrop-blur-sm min-h-25 flex items-center justify-center p-4 transition-all hover:border-[#30363d]">
          {children}
        </div>
      </div>

      {/* SUBTLE FOOTER TAG */}
      <p className="mt-2 text-[9px] text-[#475569] text-right font-mono italic opacity-50 uppercase tracking-tighter">
        Lumina_Ads_v2.0 // encrypted_stream
      </p>
    </div>
  );
};

export default AdWrapper;
