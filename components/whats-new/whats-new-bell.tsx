"use client";

import { ArrowRight, Bell, CheckCheck, Sparkles, UploadCloud, Users } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  FEATURES,
  featureForPath,
  markAllFeaturesSeen,
  markFeatureSeen,
  useUnseenFeatures,
  type Feature,
} from "@/lib/whats-new";
import { cn } from "@/lib/utils";
import NewBadge from "./new-badge";

const ICONS: Record<Feature["icon"], typeof Users> = { community: Users, upload: UploadCloud };

/**
 * Bell in the top bar: unread count, and a drawer listing the recent features
 * with a link to each and "Mark all as read". Also listens to every click in the
 * app: following a link to a new feature marks it as seen.
 */
export default function WhatsNewBell() {
  const t = useTranslations("whatsNew");
  const format = useFormatter();
  const unseen = useUnseenFeatures();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link) return;
      try {
        const url = new URL((link as HTMLAnchorElement).href);
        if (url.origin !== window.location.origin) return;
        const feature = featureForPath(url.pathname);
        if (feature) markFeatureSeen(feature.id);
      } catch {
        // not a URL
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const count = unseen.length;
  const label = count ? t("bellUnread", { count }) : t("bell");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          data-no-smartlink
          className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-elevated/50 text-foreground transition-colors hover:border-cyan-500/50 hover:bg-elevated focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
        >
          <Bell
            className={cn("h-5 w-5", count > 0 && "motion-safe:animate-[wiggle_2.4s_ease-in-out_infinite]")}
            aria-hidden
          />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-linear-to-r from-fuchsia-500 to-orange-400 px-1 text-[10px] font-black text-white shadow-[0_0_12px_rgba(217,70,239,0.8)] ring-2 ring-background">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        data-no-smartlink
        className="z-100 flex w-full flex-col gap-0 border-line-strong bg-background/95 p-0 backdrop-blur-2xl sm:w-100 sm:max-w-100"
      >
        <div className="space-y-1 border-b border-line p-6 pr-14">
          <SheetTitle className="flex items-center gap-2 text-2xl font-black tracking-tighter text-foreground uppercase italic">
            <Sparkles className="h-5 w-5 text-fuchsia-500 not-italic" aria-hidden />
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-sm text-fg-muted">
            {count ? t("subtitleUnread", { count }) : t("subtitleRead")}
          </SheetDescription>
        </div>

        <ul className="flex-1 space-y-3 overflow-y-auto p-6">
          {FEATURES.map((feature) => {
            const Icon = ICONS[feature.icon];
            const isNew = unseen.some((f) => f.id === feature.id);
            return (
              <li key={feature.id}>
                <SheetClose asChild>
                  <Link
                    href={feature.href}
                    onClick={() => markFeatureSeen(feature.id)}
                    className={cn(
                      "group flex gap-4 rounded-3xl border p-4 transition-colors",
                      isNew
                        ? "border-fuchsia-500/40 bg-fuchsia-500/5 hover:border-fuchsia-500/70"
                        : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                        isNew ? "bg-fuchsia-500/15 text-fuchsia-500" : "bg-tint text-fg-muted",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-black text-foreground">
                          {t(`items.${feature.id}.title` as "items.community.title")}
                        </span>
                        <NewBadge feature={feature.id} />
                      </span>
                      <span className="block text-xs leading-relaxed text-fg-muted">
                        {t(`items.${feature.id}.description` as "items.community.description")}
                      </span>
                      <span className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-fg-subtle">
                          {format.dateTime(new Date(`${feature.since}T12:00:00Z`), { dateStyle: "medium" })}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-brand uppercase">
                          {t("discover")}
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </span>
                    </span>
                  </Link>
                </SheetClose>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-line p-6">
          <button
            type="button"
            onClick={markAllFeaturesSeen}
            disabled={count === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 text-xs font-black tracking-widest text-black uppercase transition-colors hover:bg-cyan-400 disabled:cursor-default disabled:bg-tint disabled:text-fg-subtle"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            {count ? t("markAll") : t("allRead")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
