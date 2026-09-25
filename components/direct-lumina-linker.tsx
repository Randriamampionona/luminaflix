"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Download, Lock, Smartphone, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};
const detectMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

interface DirectLuminaLinkerProps {
  embedUrl: string;
  title?: string;
}

/**
 * Floating download button.
 *
 * BUG FIX (auth redirect state loss): signed-out users used to be pushed to
 * `/sign-in?fallback_redirect_url=<pathname>`, which lost `?s=&e=` and was
 * ignored by sign-up / OAuth. `requireAuth()` now captures the full current
 * URL and hands it to Clerk (plus a sessionStorage safety net).
 */
export default function DirectLuminaLinker({ embedUrl, title = "LuminaFlix" }: DirectLuminaLinkerProps) {
  const t = useTranslations("download");
  const { isSignedIn, requireAuth } = useAuthGate();

  const isMobile = useSyncExternalStore(subscribeNoop, detectMobile, () => false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  // Escape closes the QR dialog; listener only exists while it's open.
  useEffect(() => {
    if (!showQR) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQR(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showQR]);

  const handleClick = () => {
    if (!requireAuth()) return;

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
      // Read at click time so the QR code carries the current season/episode.
      setCurrentUrl(window.location.href);
      setShowQR(true);
    }
  };

  return (
    <>
      <div className="fixed right-4 bottom-4 z-100 sm:right-8 sm:bottom-8">
        <div className="group relative flex items-center justify-end">
          <div
            className={cn(
              "absolute right-0 flex items-center pr-14 transition-all duration-500",
              isMobile
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100",
            )}
          >
            <div className="mr-2 whitespace-nowrap rounded-md bg-white px-6 py-3 text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <div className="flex flex-col items-start leading-none">
                <span className="flex items-center gap-2 text-[11px] font-black uppercase italic tracking-tighter">
                  {isSignedIn ? (
                    <Download className="h-3 w-3 text-cyan-600" />
                  ) : (
                    <Lock className="h-3 w-3 text-cyan-600" />
                  )}
                  {isSignedIn ? t("download") : t("loginRequired")}
                </span>
                <span className="mt-1 text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-600">
                  {isSignedIn ? t("directAccess") : t("authNeeded")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClick}
            aria-label={isSignedIn ? t("buttonLabel") : t("loginRequired")}
            className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-black shadow-[0_0_40px_-10px_rgba(0,0,0,1)] transition-all duration-500 hover:border-cyan-500/50 focus-visible:border-cyan-500"
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 animate-pulse rounded-md group-hover:hidden",
                isSignedIn ? "bg-cyan-500/10" : "bg-white/5",
              )}
            />
            <Download className="h-6 w-6 text-white transition-colors group-hover:text-cyan-400" />
            <span
              aria-hidden
              className={cn(
                "absolute top-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black transition-colors",
                isSignedIn ? "bg-cyan-500" : "bg-zinc-600",
              )}
            />
          </button>
        </div>
      </div>

      {showQR && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lumina-qr-title"
          onClick={() => setShowQR(false)}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl animate-in fade-in duration-300"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar relative max-h-full w-full max-w-100 overflow-y-auto rounded-[3rem] border border-white/10 bg-zinc-900 p-6 text-center shadow-2xl sm:p-10"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-transparent via-cyan-500 to-transparent" />

            <button
              type="button"
              onClick={() => setShowQR(false)}
              aria-label={t("close")}
              className="absolute top-8 right-8 cursor-pointer rounded-full bg-white/5 p-2 text-zinc-500 transition-all hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1">
                  <Smartphone className="h-3 w-3 text-cyan-500" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-cyan-500">
                    {t("qrBadge")}
                  </span>
                </div>
                <h3
                  id="lumina-qr-title"
                  className="text-2xl font-black uppercase italic tracking-tighter text-white"
                >
                  {t("qrTitle")}
                </h3>
                <p className="px-4 text-xs leading-relaxed text-zinc-400">{t("qrBody")}</p>
              </div>

              <div className="relative mx-auto w-fit rounded-[2.5rem] bg-white p-6 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
                <QRCodeSVG
                  value={currentUrl}
                  size={220}
                  level="H"
                  marginSize={0}
                  imageSettings={{ src: "/favicon.ico", height: 48, width: 48, excavate: true }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
