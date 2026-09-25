"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCcw, ShieldAlert } from "lucide-react";

const IS_PROD = process.env.NODE_ENV === "production";
const OVERLAY_ID = "lumina-guard-overlay";
type BlockReason = "adblock" | "idm";

/**
 * Blocks the player when an ad blocker or a download-manager extension is
 * detected. Listeners are registered once and removed on unmount.
 */
export default function GuardProtocol({ children }: { children: React.ReactNode }) {
  const t = useTranslations("guard");
  const [reason, setReason] = useState<BlockReason | null>(null);

  useEffect(() => {
    let cancelled = false;

    const onContextMenu = (e: MouseEvent) => {
      if (IS_PROD) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!IS_PROD) return;
      const key = e.key.toUpperCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (key === "I" || key === "J")) ||
        (e.ctrlKey && key === "U")
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    (async () => {
      try {
        await fetch("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
      } catch {
        if (!cancelled) setReason("adblock");
        return;
      }
      const idmAttributes = ["__idm_id__", "idm_extension"];
      if (!cancelled && document.body.getAttributeNames().some((a) => idmAttributes.includes(a))) {
        setReason("idm");
      }
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Reload if the overlay is removed from the DOM by hand.
  useEffect(() => {
    if (!reason) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof HTMLElement && node.id === OVERLAY_ID) {
            window.location.reload();
            return;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [reason]);

  if (!reason) return <>{children}</>;

  return (
    <div
      id={OVERLAY_ID}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="lumina-guard-title"
      className="fixed inset-0 z-999999 flex h-screen w-screen select-none flex-col items-center justify-center overflow-hidden bg-zinc-950 p-8 text-center"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.12),transparent_60%)]" />

      <div className="relative z-10 max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-red-500/40 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>

        <div className="space-y-4">
          <h1
            id="lumina-guard-title"
            className="text-3xl font-black uppercase italic tracking-tighter text-white md:text-4xl"
          >
            {t("title")}
          </h1>
          <span className="inline-block rounded-full border border-red-500/50 bg-red-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
            {t("code", { reason: t(reason) })}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-zinc-400">{t("body", { what: t(reason) })}</p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="group mx-auto flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-12 py-5 transition-all duration-500 hover:bg-cyan-500"
        >
          <RefreshCcw className="h-4 w-4 text-black transition-transform duration-700 group-hover:rotate-180" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-black">{t("reload")}</span>
        </button>
      </div>
    </div>
  );
}
