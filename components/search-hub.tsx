"use client";

import { CornerDownLeft, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import SearchPanel from "@/components/search/search-panel";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Global search (Ctrl/Cmd + K) on large screens: the search bar button opens
 * the shared search panel (components/search/search-panel.tsx) in a dialog.
 * Phones and tablets use the same panel on the /search page.
 */
export default function SearchHub() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex cursor-pointer items-center gap-4 rounded-2xl border border-cyan-500/50 bg-elevated px-4 py-3 transition-colors hover:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Search className="h-4 w-4 text-brand-bright" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fg-muted">{t("search.trigger")}</span>
        <kbd className="hidden rounded border border-line-strong bg-background px-1.5 py-0.5 text-[9px] font-bold text-fg-subtle xl:inline">
          {t("search.shortcut")}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="z-100 flex max-h-[88vh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl border-line-strong bg-surface p-0 shadow-[0_0_120px_-20px_rgba(6,182,212,0.45)] outline-none sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">{t("search.dialogTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("search.smart.hint")}</DialogDescription>

          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 left-1/2 h-56 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
          />

          {open && (
            <SearchPanel
              variant="dialog"
              onNavigate={navigate}
              headerAction={
                <DialogClose
                  aria-label={t("common.close")}
                  className="cursor-pointer rounded-full border border-line-strong bg-tint p-1.5 text-fg-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <X className="h-4 w-4" />
                </DialogClose>
              }
            />
          )}

          {/* Footer: keyboard hints */}
          <div className="relative z-10 hidden shrink-0 items-center justify-end gap-5 border-t border-line bg-background/40 px-7 py-3.5 text-[10px] font-bold uppercase tracking-wider text-fg-faint sm:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">↑ ↓</kbd>
              {t("search.hub.arrowsHint")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="flex items-center rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">
                <CornerDownLeft className="h-3 w-3" aria-hidden />
              </kbd>
              {t("search.hub.enterHint")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">ESC</kbd>
              {t("search.escHint")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line-strong bg-elevated px-1.5 py-0.5 text-fg-subtle">
                {t("search.shortcut")}
              </kbd>
              {t("search.hub.toggleHint")}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
