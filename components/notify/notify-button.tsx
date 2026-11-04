"use client";

import { BellPlus, BellRing, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getNotifyState, unwatchTitle, watchTitle } from "@/action/notify-watch.action";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { getPushToken, isPushSupported } from "@/lib/push-client";
import { cn } from "@/lib/utils";

export type NotifyKind = "movie" | "tv" | "kdrama" | "anime";

/** After signing in from this button, the alert is turned on automatically on the way back. */
const PENDING_KEY = "lf_pending_notify";
const stateCache = new Map<string, boolean>();

/**
 * "Notify me" when a title — or an episode — becomes available in VF or
 * VOSTFR: an e-mail, plus a push notification if the browser allows them.
 * Needs an account: visitors get the sign-in popup and come back to the same
 * page, where the alert is switched on for them.
 * Amber = not notified yet · green = notification on (click again to cancel).
 */
export default function NotifyButton({
  kind,
  id,
  season,
  episode,
  title,
  posterPath,
  size = "md",
  className,
}: {
  kind: NotifyKind;
  id: number | string;
  season?: number;
  episode?: number;
  title: string;
  posterPath: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("notify");
  const locale = useLocale();
  const { isLoaded, isSignedIn, requireAuth } = useAuthGate();
  const key = kind === "movie" ? `movie_${id}` : `${kind}_${id}_s${season ?? 1}e${episode ?? 1}`;
  const target = { kind, id: String(id), season, episode };
  const [state, setState] = useState<{ key: string; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);
  const on = state?.key === key ? state.on : (stateCache.get(key) ?? false);

  // Current state for the signed-in user (one read per title, cached for the visit).
  useEffect(() => {
    if (!isSignedIn) return;
    let alive = true;
    if (stateCache.has(key)) return;
    void getNotifyState({ kind, id: String(id), season, episode }).then((value) => {
      stateCache.set(key, value);
      if (alive) setState({ key, on: value });
    });
    return () => {
      alive = false;
    };
  }, [isSignedIn, key, kind, id, season, episode]);

  const subscribe = useCallback(
    async (fromClick: boolean) => {
      setBusy(true);
      try {
        // Push too if possible (asks for permission only on a real click).
        let token: string | null = null;
        if (await isPushSupported().catch(() => false)) {
          if (fromClick && Notification.permission === "default")
            await Notification.requestPermission().catch(() => {});
          if (Notification.permission === "granted") token = await getPushToken().catch(() => null);
        }
        const result = await watchTitle({ ...target, title, posterPath, token, locale });
        if (result === "signin") {
          requireAuth();
          return;
        }
        if (result !== "ok") throw new Error(result);
        stateCache.set(key, true);
        setState({ key, on: true });
        toast.success(t("onTitle"), { description: token ? t("onPushAndEmail", { title }) : t("onEmail", { title }) });
      } catch {
        toast.error(t("failed"));
      } finally {
        setBusy(false);
      }
    },
    // target is rebuilt from these values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, title, posterPath, locale, requireAuth, t],
  );

  // Back from the sign-in popup / page: finish what the visitor asked for.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || autoRan.current) return;
    try {
      if (sessionStorage.getItem(PENDING_KEY) !== key) return;
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      return;
    }
    autoRan.current = true;
    void subscribe(false);
  }, [isLoaded, isSignedIn, key, subscribe]);

  const onClick = async () => {
    if (busy) return;
    if (!isSignedIn) {
      try {
        sessionStorage.setItem(PENDING_KEY, key);
      } catch {
        // ignore
      }
      requireAuth();
      return;
    }
    if (!on) return subscribe(true);
    setBusy(true);
    try {
      const token = Notification?.permission === "granted" ? await getPushToken().catch(() => null) : null;
      await unwatchTitle({ ...target, token });
      stateCache.set(key, false);
      setState({ key, on: false });
      toast(t("off", { title }));
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : on ? BellRing : BellPlus;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={on ? t("cancelHint") : t("hint")}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border font-black tracking-wider uppercase transition-all focus-visible:outline-none focus-visible:ring-4",
        size === "sm" && "px-3 py-2 text-[10px]",
        size === "md" && "px-4 py-2.5 text-[11px]",
        size === "lg" && "px-5 py-3 text-xs sm:px-6",
        on
          ? "border-emerald-400/60 bg-emerald-500 text-black shadow-[0_8px_30px_-8px_rgba(16,185,129,0.7)] hover:bg-emerald-400 focus-visible:ring-emerald-500/40"
          : "border-amber-400/50 bg-amber-400/10 text-amber-500 hover:bg-amber-400 hover:text-black focus-visible:ring-amber-400/40 dark:text-amber-300",
        className,
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", busy && "animate-spin")}
        aria-hidden
      />
      <span className="truncate">{on ? t("notifying") : t("notify")}</span>
    </button>
  );
}
