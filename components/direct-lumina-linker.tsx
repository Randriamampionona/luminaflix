"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Apple, Check, Copy, Download, ExternalLink, Info, Lock, Play, Smartphone, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { cn } from "@/lib/utils";

/** 1DM (download manager) — recommended app for downloads on the phone. */
const ONE_DM_STORES = [
  {
    key: "googlePlay",
    icon: Play,
    href: "https://play.google.com/store/apps/details?id=idm.internet.download.manager&hl=en&pli=1",
  },
  { key: "appStore", icon: Apple, href: "https://apps.apple.com/us/app/1dm-browser-downloader/id6670422630" },
] as const;

const subscribeNoop = () => () => {};
const detectMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

interface DirectLuminaLinkerProps {
  embedUrl: string;
  title?: string;
}

/**
 * Floating "Download" call-to-action.
 *
 * - Mobile: hands the stream to the download manager app (Android intent).
 * - Desktop: opens a QR code so the download continues on the phone.
 * - Signed out: the same button opens Clerk sign-in and returns here
 *   afterwards (requireAuth keeps the full URL, including ?s=&e=).
 *
 * Motion (entrance, attention ping, shine, icon bob) is disabled for users
 * who prefer reduced motion.
 */
export default function DirectLuminaLinker({ embedUrl, title = "LuminaFlix" }: DirectLuminaLinkerProps) {
  const t = useTranslations("download");
  const { isSignedIn, requireAuth } = useAuthGate();

  const isMobile = useSyncExternalStore(subscribeNoop, detectMobile, () => false);
  const [showQR, setShowQR] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Dialog: Escape closes, focus moves in and back out, page doesn't scroll behind.
  useEffect(() => {
    if (!showQR) return;
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowQR(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
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
      setCopied(false);
      setShowQR(true);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  // On the phone the button hands off to 1DM — say so (step 3 of the QR guide).
  const label = isSignedIn ? (isMobile ? t("mobileCta") : t("download")) : t("loginRequired");
  const sub = isSignedIn ? t("ctaSub") : t("lockedSub");

  return (
    <>
      <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-100 animate-in fade-in slide-in-from-bottom-6 duration-700 sm:right-8 sm:bottom-8 motion-reduce:animate-none">
        <div className="group relative">
          {/* Attention ring: pulses three times after the page loads, then rests. */}
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-2xl bg-cyan-400/40 [animation-iteration-count:3] motion-reduce:hidden"
          />
          {/* Soft glow that grows on hover */}
          <span
            aria-hidden
            className="absolute -inset-1 rounded-3xl bg-linear-to-r from-cyan-400 to-blue-600 opacity-40 blur-lg transition-opacity duration-500 group-hover:opacity-70"
          />

          <button
            ref={triggerRef}
            type="button"
            onClick={handleClick}
            aria-label={isSignedIn ? `${t("buttonLabel")} — ${title}` : t("loginRequired")}
            className="group relative isolate flex cursor-pointer items-center gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-cyan-400 via-cyan-500 to-blue-500 bg-size-[200%_100%] bg-left py-2.5 pr-5 pl-2.5 text-black shadow-[0_12px_40px_-12px_rgba(6,182,212,0.8)] transition-all duration-500 hover:-translate-y-0.5 hover:bg-right hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.8)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 active:translate-y-0 active:scale-[0.97] sm:py-3 sm:pr-6 sm:pl-3"
          >
            {/* Shine sweeping across the button */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/2 bg-linear-to-r from-transparent via-white/60 to-transparent animate-[download-shine_4s_ease-in-out_infinite] motion-reduce:hidden"
            />

            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/15 ring-1 ring-black/10 sm:h-10 sm:w-10">
              {isSignedIn ? (
                <Download
                  className="h-5 w-5 animate-[download-bob_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
                  strokeWidth={2.5}
                />
              ) : (
                <Lock className="h-4.5 w-4.5" strokeWidth={2.5} />
              )}
              {/* Status dot: cyan-white when ready, dark when sign-in is needed */}
              <span
                aria-hidden
                className={cn(
                  "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-cyan-400",
                  isSignedIn ? "bg-white" : "bg-zinc-900",
                )}
              />
            </span>

            <span className="flex flex-col items-start leading-none">
              <span className="text-[13px] font-black uppercase italic tracking-tight sm:text-sm">{label}</span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-black/60">{sub}</span>
            </span>
          </button>
        </div>
      </div>

      {showQR && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lumina-qr-title"
          aria-describedby="lumina-qr-body"
          onClick={() => setShowQR(false)}
          className="fixed inset-0 z-110 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar relative max-h-full w-full max-w-md overflow-y-auto sm:max-w-3xl rounded-4xl border border-line-strong bg-surface shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b border-line px-6 pt-6 pb-5 sm:px-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl"
              />
              <div className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-cyan-400 via-cyan-500 to-blue-500" />

              <button
                ref={closeRef}
                type="button"
                onClick={() => setShowQR(false)}
                aria-label={t("close")}
                className="absolute top-5 right-5 cursor-pointer rounded-full border border-line-strong bg-tint p-2 text-fg-subtle transition-colors hover:bg-tint-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative space-y-3 pr-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1">
                  <Smartphone className="h-3 w-3 text-brand" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand">{t("qrBadge")}</span>
                </span>
                <h3
                  id="lumina-qr-title"
                  className="text-2xl font-black uppercase italic tracking-tighter text-foreground"
                >
                  {t("qrTitle")}
                  <span className="text-brand not-italic">.</span>
                </h3>
                <p id="lumina-qr-body" className="text-sm leading-relaxed text-fg-muted">
                  {t("qrBody")}
                </p>
              </div>
            </div>

            {/* QR with animated scanner frame */}
            <div className="grid gap-6 px-6 py-7 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8 sm:px-8">
              {/* Left: QR + copy link */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative rounded-3xl bg-white p-5 shadow-[0_0_60px_rgba(6,182,212,0.18)]">
                  {(
                    [
                      "top-2 left-2 border-t-3 border-l-3 rounded-tl-xl",
                      "top-2 right-2 border-t-3 border-r-3 rounded-tr-xl",
                      "bottom-2 left-2 border-b-3 border-l-3 rounded-bl-xl",
                      "bottom-2 right-2 border-b-3 border-r-3 rounded-br-xl",
                    ] as const
                  ).map((corner) => (
                    <span key={corner} aria-hidden className={cn("absolute h-7 w-7 border-cyan-500", corner)} />
                  ))}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-5 h-0.5 rounded-full bg-cyan-500/70 shadow-[0_0_12px_rgba(6,182,212,0.9)] animate-[qr-scan_2.6s_ease-in-out_infinite] motion-reduce:hidden"
                  />
                  <QRCodeSVG
                    value={currentUrl}
                    size={180}
                    level="H"
                    marginSize={0}
                    imageSettings={{ src: "/favicon.ico", height: 44, width: 44, excavate: true }}
                  />
                </div>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line-strong bg-tint py-3.5 text-[11px] font-black uppercase tracking-widest text-foreground transition-colors hover:border-cyan-500/50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? t("copied") : t("copyLink")}
                </button>
              </div>

              {/* Right: steps + 1DM recommendation */}
              <div className="space-y-4">
                <ol className="grid w-full gap-2.5">
                  {[t("step1"), t("step2"), t("step3"), t("step4")].map((step, index) => (
                    <li
                      key={step}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-tint-soft px-4 py-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[11px] font-black text-black">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-fg-soft">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* 1DM recommendation */}
                <div className="w-full rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-brand">
                      <Info className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">{t("hintTitle")}</p>
                      <p className="text-xs leading-relaxed text-fg-soft">{t("hintBody")}</p>
                      <p className="pt-1 text-xs font-semibold text-fg-muted">{t("hintCta")}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {ONE_DM_STORES.map(({ key, icon: Icon, href }) => (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-2 rounded-xl bg-inverse px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-inverse-fg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:translate-y-0"
                      >
                        <Icon className="h-4 w-4" aria-hidden />
                        {t(key)}
                        <ExternalLink
                          className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
