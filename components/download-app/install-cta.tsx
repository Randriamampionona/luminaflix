"use client";

import { ArrowDown, CheckCircle2, Download, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

/**
 * Install button for /download_app:
 * - one tap install when the browser offers it (beforeinstallprompt);
 * - "You're using the app" inside the installed app (in the browser the
 *   install options always stay visible);
 * - otherwise scrolls to the step-by-step guide for this device.
 */
export default function InstallCta({ size = "lg", className }: { size?: "lg" | "md"; className?: string }) {
  const t = useTranslations("downloadApp");
  const { canInstall, isStandalone, platform, promptInstall } = usePWAInstall();
  const [busy, setBusy] = useState(false);

  const base = cn(
    "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40",
    size === "lg" ? "px-8 py-4 text-xs" : "px-6 py-3 text-[11px]",
    className,
  );

  if (isStandalone) {
    return (
      <span className={cn(base, "cursor-default border border-emerald-500/40 bg-emerald-500/10 text-emerald-500")}>
        <CheckCircle2 className="h-5 w-5" aria-hidden />
        {t("ctaUsingApp")}
      </span>
    );
  }

  if (canInstall) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            if ((await promptInstall()) === "accepted") toast.success(t("installedToast"));
          } finally {
            setBusy(false);
          }
        }}
        className={cn(
          base,
          "bg-cyan-500 text-black shadow-[0_18px_50px_-14px_rgba(6,182,212,0.9)] hover:-translate-y-0.5 hover:bg-cyan-400 disabled:cursor-wait",
        )}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Download className="h-5 w-5" aria-hidden />}
        {t("ctaInstall")}
      </button>
    );
  }

  // No one-tap install in this browser (yet): go to the guide for this device.
  return (
    <a
      href={`#install-guide`}
      data-platform={platform}
      className={cn(base, "bg-cyan-500 text-black hover:-translate-y-0.5 hover:bg-cyan-400")}
    >
      <ArrowDown className="h-5 w-5" aria-hidden />
      {platform === "unsupported" ? t("ctaOtherBrowser") : t("ctaHowTo")}
    </a>
  );
}
