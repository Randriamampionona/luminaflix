/** 3725 → "1h 2m" · 125 → "2m 5s" · 42 → "42s" */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

/** "FR" → 🇫🇷 */
export function flag(country: string) {
  if (!/^[A-Z]{2}$/.test(country) || country === "XX") return "🌐";
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(country: string) {
  if (!/^[A-Z]{2}$/.test(country) || country === "XX") return "Unknown";
  regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
  try {
    return regionNames.of(country) ?? country;
  } catch {
    return country;
  }
}

export function timeAgo(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

/** "2026-10-12" → "Oct 12" */
export function shortDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
