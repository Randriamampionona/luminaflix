"use client";

import { useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS: { value: "light" | "dark" | "system"; icon: LucideIcon }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

// `true` only after hydration: the stored theme is unknown on the server.
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Accessible 3-way theme switch (radiogroup with roving focus and arrow-key
 * support). `compact` shows icons only (navbar); `full` adds labels (mobile menu).
 */
export default function ThemeToggle({ variant = "compact", className }: { variant?: "compact" | "full"; className?: string }) {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const current = mounted ? (theme ?? "system") : null;
  const activeIndex = OPTIONS.findIndex((o) => o.value === current);
  const full = variant === "full";

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + OPTIONS.length) % OPTIONS.length;
    setTheme(OPTIONS[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "relative isolate grid grid-cols-3 rounded-xl border border-line-strong bg-tint p-1",
        full ? "w-full" : "h-11 w-31",
        className,
      )}
    >
      {/* Sliding highlight behind the active option. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 -z-10 w-[calc((100%-0.5rem)/3)] rounded-lg bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
          activeIndex < 0 && "opacity-0",
        )}
        style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
      />
      {OPTIONS.map(({ value, icon: Icon }, index) => {
        const selected = value === current;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: one tab stop for the whole group.
            tabIndex={selected || (activeIndex < 0 && index === 0) ? 0 : -1}
            aria-label={t(value)}
            title={t(value)}
            onClick={() => setTheme(value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-cyan-500/60",
              full ? "py-3" : "h-full",
              selected ? "text-black" : "text-fg-subtle hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {full && <span>{t(value)}</span>}
          </button>
        );
      })}
    </div>
  );
}
