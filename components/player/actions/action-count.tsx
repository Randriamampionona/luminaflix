import { useFormatter } from "next-intl";

/** Compact, locale-aware count (1.2K / 1,2 k). */
export function ActionCount({ value }: { value: number }) {
  const format = useFormatter();
  return (
    <span className="min-w-4 text-[10px] font-bold tabular-nums">
      {format.number(value, { notation: "compact", maximumFractionDigits: 1 })}
    </span>
  );
}
