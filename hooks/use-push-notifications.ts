"use client";

import { useAuth } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { removePushToken, savePushToken } from "@/action/push-tokens.action";
import { deletePushToken, getPushToken, isPushSupported } from "@/lib/push-client";

const TOKEN_KEY = "luminaflix:fcm-token";
/** Set when the user turns notifications off in the menu: we stop asking. */
export const PUSH_OPT_OUT_KEY = "luminaflix:push-opt-out";

const storage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string | null) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // storage blocked
    }
  },
};

type PushResult = "enabled" | "denied" | "failed";

/**
 * Push notification state for the signed-in user on this browser:
 * support detection, permission, enable / disable, and silent token refresh
 * (FCM tokens rotate; the newest one is re-saved on every visit).
 */
export function usePushNotifications() {
  const { isSignedIn } = useAuth();
  const locale = useLocale();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void isPushSupported().then((ok) => {
      if (!active) return;
      setSupported(ok);
      if (ok) {
        setPermission(Notification.permission);
        setSubscribed(Notification.permission === "granted" && !!storage.get(TOKEN_KEY));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Keep the stored token fresh (and in the right language) on each visit.
  useEffect(() => {
    if (!supported || !isSignedIn || permission !== "granted" || storage.get(PUSH_OPT_OUT_KEY)) return;
    let active = true;
    void getPushToken()
      .then(async (token) => {
        if (!active || !token) return;
        const res = await savePushToken(token, locale);
        if (res.ok && active) {
          storage.set(TOKEN_KEY, token);
          setSubscribed(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [supported, isSignedIn, permission, locale]);

  const enable = useCallback(async (): Promise<PushResult> => {
    if (!supported) return "failed";
    setBusy(true);
    try {
      // Must run inside the click handler (user gesture) for the browser prompt.
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return "denied";

      const token = await getPushToken();
      if (!token) return "failed";
      const res = await savePushToken(token, locale);
      if (!res.ok) return "failed";

      storage.set(TOKEN_KEY, token);
      storage.set(PUSH_OPT_OUT_KEY, null);
      setSubscribed(true);
      return "enabled";
    } catch (error) {
      console.error("[push] enable failed", error);
      return "failed";
    } finally {
      setBusy(false);
    }
  }, [supported, locale]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const token = storage.get(TOKEN_KEY);
      if (token) await removePushToken(token);
      await deletePushToken();
    } catch (error) {
      console.error("[push] disable failed", error);
    } finally {
      storage.set(TOKEN_KEY, null);
      storage.set(PUSH_OPT_OUT_KEY, String(Date.now()));
      setSubscribed(false);
      setBusy(false);
    }
  }, []);

  return { supported, permission, subscribed, busy, enable, disable, isSignedIn: !!isSignedIn };
}
