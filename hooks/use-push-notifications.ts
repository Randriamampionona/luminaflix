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

/** If the browser hasn't answered after this long, it's probably showing a "quiet" prompt in the address bar. */
const QUIET_PROMPT_AFTER_MS = 3_000;

/** Turns Firebase / browser errors into a hint for the console (setup problems are the usual cause). */
function explain(error: unknown) {
  // DOMException.code is a number: always compare strings.
  const code = String((error as { code?: unknown })?.code ?? "");
  const message = error instanceof Error ? error.message : String(error);
  if (code.startsWith("installations/") || /installations/i.test(message)) {
    return "Firebase Installations request failed: check NEXT_PUBLIC_FIREBASE_API_KEY / PROJECT_ID / APP_ID, that the API key allows this domain (Google Cloud → Credentials → HTTP referrers) and that the 'Firebase Installations API' is enabled.";
  }
  if (code === "messaging/token-subscribe-failed") {
    return "FCM token subscription failed: enable the 'Firebase Cloud Messaging API' in Google Cloud and check NEXT_PUBLIC_FIREBASE_VAPID_KEY.";
  }
  if (code === "messaging/failed-service-worker-registration" || /service worker/i.test(message)) {
    return "The service worker /firebase-messaging-sw.js could not be registered or activated (HTTPS required; private windows often don't support push).";
  }
  if (/push service/i.test(message))
    return "The browser's push service is unavailable (private window or push disabled).";
  if (/Registration failed/i.test(message)) {
    return "The browser refused the push subscription: private/incognito windows don't support push, or notifications are blocked for this site.";
  }
  if (/applicationServerKey/i.test(message)) {
    return "NEXT_PUBLIC_FIREBASE_VAPID_KEY is not valid: use the public key from Firebase Console → Project settings → Cloud Messaging → Web Push certificates (starts with 'B', ~87 characters), then restart the dev server.";
  }
  return "";
}

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

  const enable = useCallback(
    async ({ onWaitingForBrowser }: { onWaitingForBrowser?: () => void } = {}): Promise<PushResult> => {
      if (!supported) return "failed";
      if (Notification.permission === "denied") {
        setPermission("denied");
        return "denied";
      }
      setBusy(true);
      try {
        // Must run inside the click handler (user gesture) for the browser prompt.
        // Some browsers (Edge, Chrome) show a "quiet" prompt as an icon in the
        // address bar instead of a popup: the promise then stays pending until
        // the user clicks that icon, so we tell them where to look.
        const waitingTimer = setTimeout(() => onWaitingForBrowser?.(), QUIET_PROMPT_AFTER_MS);
        const result = await Notification.requestPermission().finally(() => clearTimeout(waitingTimer));
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
        const hint = explain(error);
        if (hint) console.error(`[push] ${hint}`);
        return "failed";
      } finally {
        setBusy(false);
      }
    },
    [supported, locale],
  );

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
