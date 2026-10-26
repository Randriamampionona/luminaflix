/**
 * Seasonal decorations (components/seasonal): which event is on today.
 *
 * Windows (visitor's local date):
 *   halloween  Oct 15 → Nov 2
 *   christmas  Dec 1  → Dec 26
 *   newyear    Dec 27 → Jan 3
 *   valentine  Feb 7  → Feb 14
 * Outside them: no decoration (normal theme).
 *
 * NEXT_PUBLIC_SEASONAL_THEME: "auto" (default) · "off" · or an event name to
 * force it (preview / testing). Built into the app: redeploy after changing it.
 */
export type SeasonalEvent = "halloween" | "christmas" | "newyear" | "valentine";

const EVENTS: SeasonalEvent[] = ["halloween", "christmas", "newyear", "valentine"];

function seasonalEventFor(date: Date): SeasonalEvent | null {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 10 && d >= 15) || (m === 11 && d <= 2)) return "halloween";
  if (m === 12 && d <= 26) return "christmas";
  if ((m === 12 && d >= 27) || (m === 1 && d <= 3)) return "newyear";
  if (m === 2 && d >= 7 && d <= 14) return "valentine";
  return null;
}

export function currentSeasonalEvent(now = new Date()): SeasonalEvent | null {
  const setting = (process.env.NEXT_PUBLIC_SEASONAL_THEME || "auto").toLowerCase();
  if (setting === "off") return null;
  if ((EVENTS as string[]).includes(setting)) return setting as SeasonalEvent;
  return seasonalEventFor(now);
}
