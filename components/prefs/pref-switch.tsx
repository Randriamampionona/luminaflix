"use client";

import { Leaf, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { setPref, usePref, type Pref } from "@/lib/user-prefs";
import { cn } from "@/lib/utils";

const ICONS = { frOnly: Languages, dataSaver: Leaf } as const;

/**
 * On/off switch for a visitor preference. `variant="row"` for the menu drawer
 * (label + description), `variant="chip"` for listing toolbars.
 */
export default function PrefSwitch({ pref, variant = "row" }: { pref: Pref; variant?: "row" | "chip" }) {
  const t = useTranslations("prefs");
  const on = usePref(pref);
  const Icon = ICONS[pref];
  const toggle = () => setPref(pref, !on);

  const knob = (
    <span
      aria-hidden
      className={cn(
        "relative inline-block h-5 w-9 shrink-0 rounded-full border align-middle transition-colors",
        on ? "border-cyan-500 bg-cyan-500" : "border-line-strong bg-tint",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all",
          on ? "left-[1.1rem]" : "left-0.5",
        )}
      />
    </span>
  );

  if (variant === "chip") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-[10px] font-black tracking-widest uppercase transition-colors",
          on ? "border-cyan-500/50 bg-cyan-500/10 text-brand" : "border-line-strong bg-tint text-fg-muted hover:text-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {t(`${pref}.chip`)}
        {knob}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-cyan-500/40"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-brand">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-foreground">{t(`${pref}.label`)}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-fg-subtle">{t(`${pref}.hint`)}</span>
      </span>
      <span className="mt-1.5">{knob}</span>
    </button>
  );
}
