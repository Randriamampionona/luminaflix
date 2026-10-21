"use client";

import { CheckCircle2, Loader2, RotateCw } from "lucide-react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";

interface ReCaptcha {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "dark" | "light";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: ReCaptcha;
    __lfRecaptchaReady?: () => void;
  }
}

type Status = "loading" | "ready" | "verifying" | "success" | "error";

/** Google reCAPTCHA v2 ("I'm not a robot") → /api/bot-filter/verify → back to `next`. */
export default function HumanCheck({ siteKey, next }: { siteKey: string; next: string }) {
  const t = useTranslations("botFilter");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const onToken = useCallback(
    async (token: string) => {
      setStatus("verifying");
      setError(null);
      try {
        const res = await fetch("/api/bot-filter/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, next }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; next?: string; error?: string };
        if (!res.ok || !body.ok) throw new Error(body.error === "rate-limited" ? "rate-limited" : "failed");
        setStatus("success");
        // Full page load: the proxy sees the new cookie right away.
        window.location.replace(body.next || next);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error && err.message === "rate-limited" ? t("rateLimited") : t("failed"));
        if (widgetRef.current !== null) window.grecaptcha?.reset(widgetRef.current);
      }
    },
    [next, t],
  );

  const renderWidget = useCallback(() => {
    if (!window.grecaptcha || !containerRef.current || widgetRef.current !== null) return;
    widgetRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: siteKey,
      theme: resolvedTheme === "light" ? "light" : "dark",
      callback: (token) => void onToken(token),
      "expired-callback": () => {
        setStatus("ready");
        setError(t("expired"));
      },
      "error-callback": () => {
        setStatus("error");
        setError(t("unavailable"));
      },
    });
    setStatus("ready");
  }, [siteKey, resolvedTheme, onToken, t]);

  // The script may already be there (client navigation back to this page).
  useEffect(() => {
    window.__lfRecaptchaReady = renderWidget;
    if (window.grecaptcha?.render) renderWidget();
    return () => {
      window.__lfRecaptchaReady = undefined;
    };
  }, [renderWidget]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Script
        src={`https://www.google.com/recaptcha/api.js?onload=__lfRecaptchaReady&render=explicit&hl=${locale}`}
        strategy="afterInteractive"
      />
      {/* reCAPTCHA's own widget is 304 × 78 px */}
      <div className="flex min-h-[78px] items-center justify-center">
        <div ref={containerRef} />
        {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-cyan-400" aria-label={t("loading")} />}
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-center text-xs">
        {status === "verifying" && (
          <span className="inline-flex items-center gap-1.5 text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t("verifying")}
          </span>
        )}
        {status === "success" && (
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("success")}
          </span>
        )}
        {error && status !== "verifying" && status !== "success" && (
          <span className="inline-flex items-center gap-1.5 text-amber-400">
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            {error}
          </span>
        )}
      </p>
    </div>
  );
}
