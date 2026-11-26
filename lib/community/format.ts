/** 1,36 Go · 474 Ko · 5,2 Mo (FR) / 1.36 GB · 474 KB · 5.2 MB (EN). */
export function formatBytes(bytes: number, fr: boolean) {
  const units = fr ? ["o", "Ko", "Mo", "Go"] : ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toLocaleString(fr ? "fr-FR" : "en-US", { maximumFractionDigits: digits })} ${units[unit]}`;
}

/** 1 h 05 min · 12 min · 40 s */
export function formatDuration(seconds: number) {
  const s = Math.max(1, Math.round(seconds));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, "0")} min`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${s} s`;
}
