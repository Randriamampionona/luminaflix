"use client";

import { Bell, BellRing, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { unwatchTitle, watchTitle } from "@/action/notify-watch.action";
import { getPushToken, isPushSupported } from "@/lib/push-client";
import { cn } from "@/lib/utils";

/** Movie ids this browser asked to be notified about (button state). */
const KEY = "lf_notify_watch";
const EVENT = "lf:notify-watch";
const readIds = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const writeIds = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, ids.join(","));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
};

/**
 * "Notify me": a push notification as soon as the movie exists in VF or
 * VOSTFR (checked every day by the push cron). Asks for notification
 * permission the first time.
 */
export default function NotifyButton({ id, title, posterPath }: { id: number; title: string; posterPath: string | null }) {
  const t = useTranslations("comingSoon");
  const locale = useLocale();
  const ids = useSyncExternalStore(subscribe, readIds, () => "").split(",").filter(Boolean);
  const on = ids.includes(String(id));
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!(await isPushSupported())) {
        toast.error(t("unsupported"));
        return;
      }
      if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") {
        toast.error(t("denied"));
        return;
      }
      const token = await getPushToken();
      if (!token) throw new Error("no token");
      if (on) {
        await unwatchTitle(String(id), token);
        writeIds(ids.filter((x) => x !== String(id)));
        toast(t("off", { title }));
      } else {
        if (!(await watchTitle({ id: String(id), title, posterPath, token, locale }))) throw new Error("save failed");
        writeIds([...ids, String(id)]);
        toast.success(t("on", { title }));
      }
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : on ? BellRing : Bell;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black tracking-widest uppercase transition-colors",
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-cyan-500/40 bg-cyan-500/10 text-brand hover:bg-cyan-500 hover:text-black",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", busy && "animate-spin")} aria-hidden />
      {on ? t("notifying") : t("notify")}
    </button>
  );
}
