"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

/**
 * "Get the app" call-to-action linking to /download_app. Hidden once the app is
 * installed or when running as the app.
 * - `nav`: compact pill for the navigation bar
 * - `hero`: large button for the home hero, next to Play / More info
 */
export default function GetAppLink({
  variant,
  tabIndex,
  className,
}: {
  variant: "nav" | "hero";
  tabIndex?: number;
  className?: string;
}) {
  const t = useTranslations();
  const { isInstalled } = usePWAInstall();
  if (isInstalled) return null;

  if (variant === "nav") {
    return (
      <Link
        href="/download_app"
        title={t("nav.downloadApp")}
        className={cn(
          "group flex h-11 items-center gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-3.5 text-[10px] font-black tracking-[0.2em] text-brand uppercase transition-colors hover:border-cyan-400 hover:bg-cyan-500 hover:text-black",
          className,
        )}
      >
        <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" aria-hidden />
        <span>{t("nav.downloadAppShort")}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/download_app"
      tabIndex={tabIndex}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-full border border-cyan-400/60 bg-cyan-500/15 px-8 py-3 text-xs font-black text-foreground uppercase shadow-[0_0_30px_-8px_rgba(6,182,212,0.8)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-cyan-500 hover:text-black md:px-10 md:py-4 md:text-sm",
        className,
      )}
    >
      {/* Shine */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent animate-[download-shine_4s_ease-in-out_infinite] motion-reduce:hidden"
      />
      <Download className="relative h-5 w-5 text-brand-bright transition-colors group-hover:text-black" aria-hidden />
      <span className="relative">{t("home.installApp")}</span>
    </Link>
  );
}
