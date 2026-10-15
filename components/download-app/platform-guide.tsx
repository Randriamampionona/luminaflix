"use client";

import {
  Apple,
  Check,
  EllipsisVertical,
  Monitor,
  MonitorDown,
  Share,
  Smartphone,
  SquarePlus,
  AppWindow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type InstallPlatform, usePWAInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

type Tab = Exclude<InstallPlatform, "unsupported">;

const TABS: { key: Tab; icon: typeof Apple; browsers: string[] }[] = [
  { key: "android", icon: Smartphone, browsers: ["Chrome", "Samsung Internet", "Edge"] },
  { key: "ios", icon: Apple, browsers: ["Safari", "Chrome", "Edge"] },
  { key: "desktop", icon: Monitor, browsers: ["Chrome", "Edge", "Brave", "Opera"] },
  { key: "mac-safari", icon: Apple, browsers: ["Safari 17+"] },
];

const STEPS: Record<Tab, { key: string; icon: typeof Apple }[]> = {
  android: [
    { key: "androidStep1", icon: EllipsisVertical },
    { key: "androidStep2", icon: SquarePlus },
    { key: "androidStep3", icon: Check },
  ],
  ios: [
    { key: "iosStep1", icon: Share },
    { key: "iosStep2", icon: SquarePlus },
    { key: "iosStep3", icon: Check },
  ],
  desktop: [
    { key: "desktopStep1", icon: MonitorDown },
    { key: "desktopStep2", icon: AppWindow },
    { key: "desktopStep3", icon: Check },
  ],
  "mac-safari": [
    { key: "macStep1", icon: Share },
    { key: "macStep2", icon: SquarePlus },
    { key: "macStep3", icon: Check },
  ],
};

/** Per-device install steps; opens on the visitor's own device. */
export default function PlatformGuide() {
  const t = useTranslations("downloadApp");
  const tSteps = useTranslations("pwa");
  const { platform } = usePWAInstall();
  const [chosen, setChosen] = useState<Tab | null>(null);
  const active: Tab = chosen ?? (platform === "unsupported" ? "desktop" : platform);

  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-8">
      <div role="tablist" aria-label={t("guideTitle")} className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setChosen(key)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors",
              active === key
                ? "border-cyan-500/50 bg-cyan-500/10 text-brand"
                : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {t(`platforms.${key}` as "platforms.android")}
            {platform === key && (
              <span className="rounded-md bg-cyan-500 px-1.5 py-0.5 text-[9px] font-black text-black uppercase">
                {t("yourDevice")}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <ol className="space-y-3">
          {STEPS[active].map(({ key, icon: Icon }, index) => (
            <li key={key} className="flex items-center gap-4 rounded-2xl border border-line bg-tint-soft p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-black text-black">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-semibold text-fg-soft">{tSteps(key as "iosStep1")}</span>
              <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden />
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2 lg:w-56 lg:flex-col">
          <p className="w-full text-[10px] font-black tracking-[0.2em] text-fg-subtle uppercase">{t("worksWith")}</p>
          {TABS.find((tab) => tab.key === active)!.browsers.map((browser) => (
            <span
              key={browser}
              className="rounded-xl border border-line-strong bg-tint px-3 py-2 text-xs font-bold text-foreground"
            >
              {browser}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
