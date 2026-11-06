"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { isCurrentUserAdmin } from "@/action/is-admin.action";
import { refundSmartlinkClick, smartlinkFor, takeSmartlinkClick } from "@/lib/smartlinks";

/** Pages where Smartlinks never trigger (accounts, checks, splash, offline, admin). */
const EXCLUDED_PATHS = ["/sign-in", "/sign-up", "/bot-filter", "/launch", "/offline", "/analytics", "/media-infos"];

/** Elements that are not "CTAs": closing things, toggles, ads, sign-in forms, form fields. */
const NOT_A_CTA = [
  "[data-no-smartlink]",
  "[data-no-smartlink] *",
  "[id^='container-']", // ad containers
  "[id^='container-'] *",
  "[class*='cl-']", // Clerk (sign-in / account popups)
  "[class*='cl-'] *",
  "[data-slot='dialog-close']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='tab']",
  "[role='slider']",
  "[role='option']",
  "[role='menuitemradio']",
  "[role='menuitemcheckbox']",
  ":disabled",
  "[aria-disabled='true']",
].join(",");
const CLOSE_LABEL = /^(close|fermer|cancel|annuler|dismiss)/i;

/** Stable key of a link / button, so it always gets the same Smartlink. */
function ctaKey(el: Element) {
  if (el instanceof HTMLAnchorElement) {
    try {
      return `a:${new URL(el.href, window.location.href).pathname}`;
    } catch {
      return `a:${el.getAttribute("href")}`;
    }
  }
  const label = el.getAttribute("aria-label") || el.textContent || "";
  return `b:${label.trim().replace(/\s+/g, " ").slice(0, 60)}`;
}

function isCta(el: Element) {
  if (el.matches(NOT_A_CTA)) return false;
  const label = (el.getAttribute("aria-label") || el.getAttribute("title") || "").trim();
  if (CLOSE_LABEL.test(label)) return false;
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute("href") ?? "";
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return false;
  }
  return true;
}

/**
 * Monetag Smartlinks on every link and button of the app (see lib/smartlinks.ts):
 * the first 1–2 clicks of a cycle open a Smartlink in a new tab instead of
 * their normal action; the next clicks work normally until the cycle ends.
 * One listener for the whole app (capture phase, before Next.js links and
 * React handlers). Never for the admin, never on excluded pages.
 */
export default function SmartlinkInterceptor() {
  const { isLoaded, isSignedIn } = useAuth();
  const isAdmin = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      isAdmin.current = false;
      return;
    }
    try {
      const cached = sessionStorage.getItem("lf_is_admin");
      if (cached !== null) {
        isAdmin.current = cached === "1";
        return;
      }
    } catch {
      // ignore
    }
    void isCurrentUserAdmin()
      .then((admin) => {
        isAdmin.current = admin;
        try {
          sessionStorage.setItem("lf_is_admin", admin ? "1" : "0");
        } catch {
          // ignore
        }
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Real left clicks only (no new-tab / modified clicks, no scripted clicks).
      if (!e.isTrusted || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      if (isAdmin.current || EXCLUDED_PATHS.some((p) => window.location.pathname.startsWith(p))) return;
      const target = e.target instanceof Element ? e.target.closest("a[href], button, [role='button']") : null;
      if (!target || !isCta(target)) return;
      if (!takeSmartlinkClick()) return;

      const opened = window.open(smartlinkFor(ctaKey(target)), "_blank");
      if (!opened) {
        // Popup blocked: let the click do its normal job, and don't count it.
        refundSmartlinkClick();
        return;
      }
      try {
        opened.opener = null;
      } catch {
        // ignore
      }
      // The Smartlink replaces this click's normal action.
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
