"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * Pages visited in this tab (sessionStorage), to know whether "back" has
 * somewhere to go inside the app; otherwise the button goes home.
 */
const DEPTH_KEY = "lf_nav_depth";
const EVENT = "lf:nav-depth";
const readDepth = () => {
  try {
    return Number(sessionStorage.getItem(DEPTH_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeDepth = (value: number) => {
  try {
    sessionStorage.setItem(DEPTH_KEY, String(Math.max(0, value)));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT));
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/**
 * Discreet "Go back" button at the left of the navbar (not on phones): back to the previous
 * page of the visit, or home when the visit started on this page. Hidden on
 * the home page when there's nothing to go back to. It's a normal button, so
 * the Smartlinks (components/ads/smartlink-interceptor.tsx) apply to it too.
 */
export default function BackButton({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const depth = useSyncExternalStore(subscribe, readDepth, () => 0);

  // One more page in this visit.
  useEffect(() => {
    writeDepth(readDepth() + 1);
  }, [pathname]);

  if (pathname === "/" && depth <= 1) return null;

  const goBack = () => {
    const current = readDepth();
    if (current > 1) {
      // Going back also counts as a page change (+1): net −1.
      writeDepth(current - 2);
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("goBack")}
      title={t("goBack")}
      className={cn(
        // Hidden on phones (not enough room in the bar); from 640 px wide.
        "hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-elevated/60 text-fg-muted backdrop-blur-md transition-colors hover:border-cyan-500/60 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:flex",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
    </button>
  );
}
