import { getTranslations } from "next-intl/server";
import { BADGES } from "@/lib/badges";
import { cn } from "@/lib/utils";

/** All badges, earned ones lit, the others greyed with what's needed. */
export async function BadgeGrid({ earned }: { earned: string[] }) {
  const t = await getTranslations("badges");
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {BADGES.map((b) => {
        const has = earned.includes(b.id);
        return (
          <li
            key={b.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
              has ? "border-cyan-500/40 bg-cyan-500/5" : "border-line bg-tint opacity-60 grayscale",
            )}
          >
            <span className="text-2xl" aria-hidden>
              {b.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-foreground">{t(`items.${b.id}.name`)}</span>
              <span className="block text-[10px] leading-snug text-fg-subtle">{t(`items.${b.id}.hint`)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A few badge emojis in a row (leaderboard rows, top fans). */
export function BadgeEmojis({ badges, max = 5 }: { badges: string[]; max?: number }) {
  const shown = BADGES.filter((b) => badges.includes(b.id)).slice(-max);
  if (shown.length === 0) return null;
  return (
    <span className="flex items-center gap-0.5 text-sm" aria-hidden>
      {shown.map((b) => (
        <span key={b.id}>{b.emoji}</span>
      ))}
    </span>
  );
}
