/**
 * What gets copied when someone shares a title: a plain-text version for
 * messaging apps (with emojis) and an HTML version with the poster for apps
 * that accept rich pastes (mail, notes, docs).
 */
export interface ShareInfo {
  title: string;
  /** "movie" | "anime" | "drama" (K-drama / series) */
  kind: "movie" | "anime" | "drama";
  /** Site path of the page to open, e.g. "/movies/123" or "/anime/play/45?s=1&e=3". */
  path: string;
  posterPath?: string | null;
  overview?: string | null;
  year?: string | null;
  rating?: number | null;
  /** e.g. "S1 · E3 — The Beginning" */
  episodeLabel?: string | null;
}

export interface ShareLabels {
  title: string;
  type: string;
  episode: string;
  rating: string;
  description: string;
  link: string;
  poster: string;
  footer: string;
  kind: string;
}

const posterUrl = (posterPath?: string | null) =>
  posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;

const truncate = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, "")}…` : clean;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

export function buildShareText(info: ShareInfo, url: string, l: ShareLabels) {
  const title = info.year ? `${info.title} (${info.year})` : info.title;
  const poster = posterUrl(info.posterPath);
  return [
    `🎬 ${l.title}: ${title}`,
    `🎞️ ${l.type}: ${l.kind}`,
    info.episodeLabel ? `📺 ${l.episode}: ${info.episodeLabel}` : null,
    info.rating ? `⭐ ${l.rating}: ${info.rating.toFixed(1)}/10` : null,
    info.overview ? `📝 ${l.description}: ${truncate(info.overview, 220)}` : null,
    `🔗 ${l.link}: ${url}`,
    poster ? `🖼️ ${l.poster}: ${poster}` : null,
    "",
    `🍿 ${l.footer}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildShareHtml(info: ShareInfo, url: string, l: ShareLabels) {
  const title = escapeHtml(info.year ? `${info.title} (${info.year})` : info.title);
  const poster = posterUrl(info.posterPath);
  const meta = [l.kind, info.episodeLabel, info.rating ? `⭐ ${info.rating.toFixed(1)}/10` : null]
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join(" · ");
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif"><tr>${
    poster
      ? `<td style="padding-right:14px;vertical-align:top"><img src="${poster}" alt="${title}" width="110" style="border-radius:10px;display:block"></td>`
      : ""
  }<td style="vertical-align:top"><p style="margin:0;font-size:17px;font-weight:bold">🎬 ${title}</p><p style="margin:4px 0;color:#555;font-size:13px">${meta}</p>${
    info.overview ? `<p style="margin:6px 0;font-size:13px">📝 ${escapeHtml(truncate(info.overview, 220))}</p>` : ""
  }<p style="margin:6px 0;font-size:13px">🔗 <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p style="margin:6px 0 0;font-size:13px">🍿 ${escapeHtml(l.footer)}</p></td></tr></table>`;
}

/** Copies the rich version when the browser allows it, plain text otherwise. */
export async function copyShare(text: string, html: string) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      return true;
    }
  } catch {
    // some browsers refuse HTML: fall back to plain text
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // old browsers / insecure contexts
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
