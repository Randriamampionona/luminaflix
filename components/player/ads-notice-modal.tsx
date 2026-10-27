"use client";

import { Check, ExternalLink, MonitorPlay, ShieldAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { schedulePrompt, setPromptOpen } from "@/lib/prompt-lock";

/** "Don't show this again" (permanent, this browser). */
const HIDDEN_KEY = "lf_ads_notice_hidden";
/** Shown at most once per visit (tab), not on every episode. */
const SEEN_KEY = "lf_ads_notice_seen";

const readFlag = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key) === "1";
  } catch {
    return false;
  }
};
const writeFlag = (storage: () => Storage, key: string) => {
  try {
    storage().setItem(key, "1");
  } catch {
    // storage blocked: the notice simply shows again next time
  }
};

/**
 * Notice on the player pages: the external players may open ad tabs or
 * redirects we don't control — just close them and come back. Shown once per
 * visit until the visitor ticks "Don't show this again". Waits its turn with
 * the other popups (lib/prompt-lock).
 */
export default function AdsNoticeModal() {
  const t = useTranslations("adsNotice");
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (readFlag(() => localStorage, HIDDEN_KEY) || readFlag(() => sessionStorage, SEEN_KEY)) return;
    return schedulePrompt("ads-notice", 700, () => setOpen(true), 1500);
  }, []);

  const close = useCallback(() => {
    writeFlag(() => sessionStorage, SEEN_KEY);
    if (dontShow) writeFlag(() => localStorage, HIDDEN_KEY);
    setOpen(false);
  }, [dontShow]);

  useEffect(() => {
    setPromptOpen("ads-notice", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    buttonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      setPromptOpen("ads-notice", false);
    };
  }, [open, close]);

  if (!open) return null;

  const steps = [t("step1"), t("step2"), t("step3")];

  return (
    <div
      className="fixed inset-0 z-110 flex items-center justify-center bg-black/70 p-3 backdrop-blur-md animate-in fade-in duration-300 sm:p-6"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ads-notice-title"
        aria-describedby="ads-notice-body"
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar relative max-h-full w-full max-w-xl overflow-y-auto rounded-3xl border border-line-strong bg-surface text-foreground shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div
          aria-hidden
          className="absolute top-0 left-0 h-1 w-full bg-linear-to-r from-amber-400 via-orange-500 to-red-500"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl"
        />
        <button
          type="button"
          onClick={close}
          aria-label={t("close")}
          className="absolute top-4 right-4 z-10 cursor-pointer rounded-full border border-line-strong bg-tint p-2 text-fg-subtle transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative space-y-5 p-5 sm:p-7">
          {/* Heading */}
          <div className="flex items-start gap-3.5 pr-10">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
              <ShieldAlert className="h-5.5 w-5.5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-black tracking-[0.25em] text-amber-600 uppercase dark:text-amber-400">
                {t("badge")}
              </p>
              <h2 id="ads-notice-title" className="text-xl leading-tight font-black tracking-tight sm:text-2xl">
                {t("title")}
              </h2>
            </div>
          </div>

          <p id="ads-notice-body" className="text-sm leading-relaxed text-fg-muted">
            {t("body")}
          </p>

          {/* Demo */}
          <figure className="overflow-hidden rounded-2xl border border-line-strong bg-[#18181e] shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF, no optimisation wanted */}
            <img
              src="/images/ads-notice-demo.gif"
              alt={t("gifAlt")}
              width={560}
              height={320}
              className="block h-auto w-full"
            />
          </figure>

          {/* Steps */}
          <ol className="grid gap-2 sm:grid-cols-3">
            {steps.map((step, i) => {
              const Icon = [MonitorPlay, ExternalLink, Check][i];
              return (
                <li key={i} className="flex items-start gap-2.5 rounded-2xl border border-line bg-tint p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[11px] font-black text-brand">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 items-start gap-1.5 text-xs leading-snug text-fg-soft">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Controls */}
          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="group flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-fg-muted select-none">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="flex h-5 w-5 items-center justify-center rounded-md border-2 border-line-strong bg-surface text-black transition-colors peer-checked:border-cyan-500 peer-checked:bg-cyan-500 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500/50 group-hover:border-cyan-500/60 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
              </span>
              {t("dontShow")}
            </label>
            <button
              ref={buttonRef}
              type="button"
              onClick={close}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-8 py-3.5 text-xs font-black tracking-widest text-black uppercase shadow-[0_14px_40px_-12px_rgba(6,182,212,0.9)] transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/40"
            >
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
              {t("gotIt")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
