"use client";

import { Bell, BellOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

/** "Notifications" on/off switch for the menu drawer's Preferences block. */
export default function PushPreference() {
  const t = useTranslations("push");
  const { supported, permission, subscribed, busy, enable, disable, isSignedIn } = usePushNotifications();
  if (!supported || !isSignedIn) return null;

  const blocked = permission === "denied";
  const on = subscribed && permission === "granted";

  const toggle = async () => {
    if (on) {
      await disable();
      toast.success(t("pref.disabled"));
      return;
    }
    const result = await enable({
      onWaitingForBrowser: () => toast.info(t("modal.waiting"), { duration: 10_000 }),
    }).catch(() => "failed" as const);
    if (result === "enabled") toast.success(t("modal.enabled"));
    else toast.error(result === "denied" ? t("modal.denied") : t("modal.failed"));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-fg-muted">{t("pref.label")}</p>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("pref.label")}
        disabled={busy || blocked}
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-line-strong bg-tint px-3 py-2.5 text-left transition-colors hover:border-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {on ? (
            <Bell className="h-4 w-4 shrink-0 text-brand" aria-hidden />
          ) : (
            <BellOff className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
          )}
          <span className="truncate text-xs font-bold text-foreground">
            {blocked ? t("pref.blocked") : on ? t("pref.on") : t("pref.off")}
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            on ? "bg-cyan-500" : "bg-tint-stronger",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              on && "translate-x-5",
            )}
          />
        </span>
      </button>
    </div>
  );
}
