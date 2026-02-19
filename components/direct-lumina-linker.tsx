"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { Download, Smartphone, X, Lock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface DirectLuminaLinkerProps {
  embedUrl: string;
  title?: string;
}

export default function DirectLuminaLinker({
  embedUrl,
  title = "Lumina Stream",
}: DirectLuminaLinkerProps) {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const [isMobile, setIsMobile] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    setCurrentUrl(window.location.href);
  }, []);

  const handleInitialClick = () => {
    if (!isSignedIn) {
      const loginUrl = `/sign-in?fallback_redirect_url=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
      return;
    }

    if (isMobile) {
      const intentUrl =
        `intent:${embedUrl}#Intent;` +
        `action=android.intent.action.VIEW;` +
        `package=idm.internet.download.manager;` +
        `S.browser_fallback_url=${encodeURIComponent(embedUrl)};` +
        `S.title=${encodeURIComponent(title)};` +
        `end`;
      window.location.href = intentUrl;
    } else {
      setShowQR(true);
    }
  };

  return (
    <>
      {/* FLOATING ACTION AREA */}
      <div className="fixed bottom-8 right-8 z-100">
        <div className="group relative flex items-center justify-end">
          {/* CONTENT LABEL */}
          {/* Desktop: Hidden until hover | Mobile: Always visible */}
          <div
            className={`
            absolute right-0 flex items-center pr-14 transition-all duration-500
            ${
              isMobile
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none"
            }
          `}
          >
            <div className="px-6 py-3 bg-white text-black rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] mr-2 whitespace-nowrap">
              <div className="flex flex-col items-start leading-none">
                <span className="text-[11px] font-black uppercase italic tracking-tighter flex items-center gap-2">
                  {!isSignedIn ? (
                    <Lock className="w-3 h-3 text-cyan-600" />
                  ) : (
                    <Download className="w-3 h-3 text-cyan-600" />
                  )}
                  {isSignedIn ? "Download Content" : "Login Required"}
                </span>
                <span className="text-[7px] font-bold text-cyan-600 uppercase tracking-[0.2em] mt-1">
                  {isSignedIn
                    ? isMobile
                      ? "Push to 1DM"
                      : "Sync to Mobile"
                    : "Authorize to Sync"}
                </span>
              </div>
            </div>
          </div>

          {/* THE ORB */}
          <button
            onClick={handleInitialClick}
            className="relative flex items-center justify-center w-14 h-14 bg-black border border-white/10 rounded-2xl shadow-[0_0_40px_-10px_rgba(0,0,0,1)] hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all duration-500 cursor-pointer"
          >
            <div
              className={`absolute inset-0 rounded-2xl animate-pulse group-hover:hidden ${isSignedIn ? "bg-cyan-500/10" : "bg-white/5"}`}
            />

            <Download className="w-6 h-6 text-white group-hover:text-cyan-400 transition-colors" />

            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-2 border-black rounded-full bg-cyan-500" />
          </button>
        </div>
      </div>

      {/* SYNC MODAL (PC ONLY) */}
      {showQR && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-100 bg-zinc-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent" />

            <button
              onClick={() => setShowQR(false)}
              className="absolute top-8 right-8 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-500 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                  <Smartphone className="w-3 h-3 text-cyan-500" />
                  <span className="text-[8px] font-black uppercase text-cyan-500 tracking-widest">
                    Device Bridge Active
                  </span>
                </div>
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">
                  Scan to <span className="text-cyan-500">Download</span>
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold leading-relaxed px-4">
                  Open your camera to sync this session to your mobile device
                  for 1DM processing.
                </p>
              </div>

              <div className="relative mx-auto p-6 bg-white rounded-[2.5rem] w-fit shadow-[0_0_60px_rgba(6,182,212,0.15)] group">
                <QRCodeSVG
                  value={currentUrl}
                  size={220}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/favicon.ico",
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em]">
                  Lumina Security Protocol v2.4
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
