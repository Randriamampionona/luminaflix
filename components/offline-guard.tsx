"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import AnimatedLogo from "@/components/brand/animated-logo";
import { cn } from "@/lib/utils";

/** While offline, re-check the connection on its own every 10 s. */
const AUTO_RETRY_MS = 10_000;
/** "Back online" stays visible this long before the screen goes away. */
const BACK_ONLINE_MS = 1_200;

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};
const getOnline = () => navigator.onLine;

/** Real check: the browser may say "online" on a Wi-Fi without internet. */
async function canReachServer() {
  try {
    const res = await fetch(`/api/ping?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Full-screen lock while there is no connection: blocks the whole app (no
 * broken pages or endless skeletons), shows a live status, re-checks every
 * 10 s and on "Try again", then refreshes the page data when back online.
 */
export default function OfflineGuard() {
  const t = useTranslations("offlineGuard");
  const router = useRouter();
  const browserOnline = useSyncExternalStore(subscribe, getOnline, () => true);
  const [unreachable, setUnreachable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showBack, setShowBack] = useState(false);
  const offline = !browserOnline || unreachable;
  const offlineRef = useRef(offline);
  useEffect(() => {
    offlineRef.current = offline;
  }, [offline]);
  const backTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Confirms the connection with a real request; shows "Back online" when it returns. */
  const check = useCallback(async () => {
    const wasOffline = offlineRef.current;
    setChecking(true);
    const ok = navigator.onLine && (await canReachServer());
    setChecking(false);
    setUnreachable(!ok);
    if (ok && wasOffline) {
      setShowBack(true);
      router.refresh(); // reload the data the page couldn't fetch
      clearTimeout(backTimer.current);
      backTimer.current = setTimeout(() => setShowBack(false), BACK_ONLINE_MS);
    }
    return ok;
  }, [router]);

  // The browser reports the network coming back → confirm it.
  useEffect(() => {
    const onOnline = () => void check();
    const onOffline = () => setShowBack(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearTimeout(backTimer.current);
    };
  }, [check]);

  // Auto-retry while offline.
  useEffect(() => {
    if (!offline) return;
    const timer = setInterval(() => void check(), AUTO_RETRY_MS);
    return () => clearInterval(timer);
  }, [offline, check]);

  // Lock the page behind the screen.
  const visible = offline || showBack;
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  if (!visible) return null;
  const back = !offline;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offline-title"
      aria-describedby="offline-body"
      className={cn(
        "dark fixed inset-0 z-[250] flex items-center justify-center overflow-y-auto bg-[#020202]/95 p-6 text-foreground backdrop-blur-xl animate-in fade-in duration-300",
        back && "animate-out fade-out fill-mode-forwards delay-700 duration-500",
      )}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700",
          back ? "bg-emerald-500/15" : "bg-cyan-500/10",
        )}
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        {/* Illustration: logo inside a broken signal */}
        <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
          {!back &&
            [0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className="absolute inset-0 animate-ping rounded-full border border-cyan-500/20 motion-reduce:hidden"
                style={{ animationDelay: `${i * 0.6}s`, animationDuration: "2.4s" }}
              />
            ))}
          <span className="absolute inset-4 rounded-full border border-white/10 bg-white/[0.03]" />
          <AnimatedLogo size={72} />
          <span
            className={cn(
              "absolute right-3 bottom-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#020202] transition-colors",
              back ? "bg-emerald-500 text-black" : "bg-red-500 text-white",
            )}
          >
            {back ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
          </span>
        </div>

        {/* Live connection indicator */}
        <span
          role="status"
          className={cn(
            "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest",
            back
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : checking
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-red-500/40 bg-red-500/10 text-red-400",
          )}
        >
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                back ? "bg-emerald-400" : checking ? "bg-amber-400" : "bg-red-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                back ? "bg-emerald-400" : checking ? "bg-amber-400" : "bg-red-400",
              )}
            />
          </span>
          {back ? t("statusBack") : checking ? t("statusChecking") : t("statusOffline")}
        </span>

        <h2 id="offline-title" className="text-3xl font-black tracking-tight uppercase italic">
          {back ? t("backTitle") : t("title")}
          <span className="text-cyan-400">.</span>
        </h2>
        <p id="offline-body" className="mt-3 text-sm leading-relaxed text-zinc-400">
          {back ? t("backBody") : t("body")}
        </p>

        {!back && (
          <>
            <button
              type="button"
              onClick={() => void check()}
              disabled={checking}
              className="mt-8 flex w-full max-w-xs cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 text-[11px] font-black uppercase tracking-widest text-black transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} aria-hidden />
              {checking ? t("checking") : t("retry")}
            </button>
            <p className="mt-4 text-[11px] text-zinc-500">{t("autoRetry")}</p>
          </>
        )}
      </div>
    </div>
  );
}
