"use client";

import { useAuth } from "@clerk/nextjs";
import { BellRing, Download, LogIn, PartyPopper, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { schedulePrompt, setPromptOpen } from "@/lib/prompt-lock";

/**
 * Shown once to visitors arriving from the old address (lumina-flix.vercel.app →
 * www.lumina-flix.live, see proxy.ts): the site moved, sign in again once, and —
 * for people who had installed the app — install the new version.
 */
export default function AppMovedNotice() {
  const t = useTranslations("moved");
  const { isSignedIn } = useAuth();
  const { canInstall, isStandalone, promptInstall } = usePWAInstall();
  const [mode, setMode] = useState<"web" | "pwa" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const moved = url.searchParams.get("moved");
    if (!moved) return;
    // Clean the address bar right away (keeps the rest of the URL).
    url.searchParams.delete("moved");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    try {
      if (localStorage.getItem("lf_moved_seen") === "1") return;
    } catch {
      // ignore
    }
    return schedulePrompt(
      "moved",
      400,
      () => {
        setMode(moved === "pwa" ? "pwa" : "web");
        setOpen(true);
      },
      1500,
    );
  }, []);

  useEffect(() => {
    setPromptOpen("moved", open);
  }, [open]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem("lf_moved_seen", "1");
    } catch {
      // ignore
    }
  };

  if (!mode) return null;
  const showInstall = mode === "pwa" && !isStandalone;

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="z-120 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-3xl border-line-strong bg-surface p-0"
      >
        <div className="h-1 w-full bg-linear-to-r from-cyan-500 via-sky-400 to-purple-500" />
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-brand">
              <PartyPopper className="h-5 w-5" aria-hidden />
            </span>
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">{t("title")}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-fg-muted">
              {t.rich("body", { b: (chunks) => <strong className="text-foreground">{chunks}</strong> })}
            </DialogDescription>
          </div>

          <ul className="space-y-2.5 text-sm text-fg-soft">
            {!isSignedIn && (
              <li className="flex gap-3 rounded-2xl border border-line bg-tint p-3">
                <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>{t("signIn")}</span>
              </li>
            )}
            {showInstall && (
              <li className="flex gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>{t("reinstall")}</span>
              </li>
            )}
            <li className="flex gap-3 rounded-2xl border border-line bg-tint p-3">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span>{t("notifications")}</span>
            </li>
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            {showInstall &&
              (canInstall ? (
                <button
                  type="button"
                  onClick={async () => {
                    await promptInstall();
                    close();
                  }}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  {t("install")}
                </button>
              ) : (
                <Link
                  href="/download_app"
                  onClick={close}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  {t("install")}
                </Link>
              ))}
            {!isSignedIn && !showInstall && (
              <Link
                href="/sign-in"
                onClick={close}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-[11px] font-black tracking-widest text-black uppercase hover:bg-cyan-400"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t("signInCta")}
              </Link>
            )}
            <button
              type="button"
              onClick={close}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-2xl border border-line-strong bg-tint px-5 py-3 text-[11px] font-black tracking-widest text-fg-muted uppercase hover:text-foreground"
            >
              {t("ok")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
