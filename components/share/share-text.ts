/**
 * What gets copied when someone shares a title: a plain-text version for
 * messaging apps (with emojis) and an HTML version with the poster for apps
 * that accept rich pastes (mail, notes, docs).
 */
export interface ShareInfo {
  title: string;
  /** "movie" | "anime" | "drama" (K-drama) | "tv" (TV show) */
  kind: "movie" | "anime" | "drama" | "tv";
  /** Site path of the page to open, e.g. "/movies/123" or "/anime/play/45?s=1&e=3". */
  path: string;
  posterPath?: string | null;
  overview?: string | null;
  year?: string | null;
  rating?: number | null;
  /** e.g. "S1 · E3 — The Beginning" */
  episodeLabel?: string | null;
  /** Series: number of seasons / episodes (shown as "📚 Seasons: 2 seasons · 16 episodes"). */
  seasons?: number | null;
  episodes?: number | null;
  /** Sharing an episode: path of the series page (all seasons and episodes). */
  seriesPath?: string | null;
}

/** Share kind → trailer page type (app/trailer/[id]). */
const TRAILER_TYPE: Record<ShareInfo["kind"], string> = { movie: "movie", anime: "anime", drama: "kdrama", tv: "tv" };

/**
 * Trailer page path of the shared title, in the sharer's language
 * (e.g. /trailer/1561726?type=movie&lang=fr). The TMDB id is the numeric
 * segment of `path` ("/movies/123", "/anime/play/45?s=1&e=3"…).
 */
export function trailerPathFor(info: ShareInfo, locale: string) {
  const id = /\/(\d+)(?:[/?#]|$)/.exec(info.path)?.[1];
  if (!id) return null;
  return `/trailer/${id}?${new URLSearchParams({ type: TRAILER_TYPE[info.kind], lang: locale })}`;
}

/** The links written in the shared text (short links when ready, full URLs otherwise). */
export interface ShareLinks {
  page: string;
  series: string | null;
  trailer: string | null;
  poster: string | null;
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
  seasons: string;
  /** Formatted "2 seasons · 16 episodes", or null. */
  seasonsValue: string | null;
  allEpisodes: string;
  trailer: string;
}

export const posterUrl = (posterPath?: string | null) =>
  posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;

const truncate = (text: string, max: number) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, "")}…` : clean;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

export function buildShareText(info: ShareInfo, links: ShareLinks, l: ShareLabels) {
  const title = info.year ? `${info.title} (${info.year})` : info.title;
  return [
    `🎬 ${l.title}: ${title}`,
    `🎞️ ${l.type}: ${l.kind}`,
    info.episodeLabel ? `📺 ${l.episode}: ${info.episodeLabel}` : null,
    l.seasonsValue ? `📚 ${l.seasons}: ${l.seasonsValue}` : null,
    info.rating ? `⭐ ${l.rating}: ${info.rating.toFixed(1)}/10` : null,
    info.overview ? `📝 ${l.description}: ${truncate(info.overview, 220)}` : null,
    `🔗 ${l.link}: ${links.page}`,
    links.series ? `📂 ${l.allEpisodes}: ${links.series}` : null,
    links.trailer ? `🎥 ${l.trailer}: ${links.trailer}` : null,
    links.poster ? `🖼️ ${l.poster}: ${links.poster}` : null,
    "",
    `🍿 ${l.footer}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function buildShareHtml(info: ShareInfo, links: ShareLinks, l: ShareLabels) {
  const title = escapeHtml(info.year ? `${info.title} (${info.year})` : info.title);
  // The <img> always uses the real image (a short link would not display as an image).
  const poster = posterUrl(info.posterPath);
  const url = links.page;
  const meta = [l.kind, info.episodeLabel, l.seasonsValue, info.rating ? `⭐ ${info.rating.toFixed(1)}/10` : null]
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join(" · ");
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif"><tr>${
    poster
      ? `<td style="padding-right:14px;vertical-align:top"><img src="${poster}" alt="${title}" width="110" style="border-radius:10px;display:block"></td>`
      : ""
  }<td style="vertical-align:top"><p style="margin:0;font-size:17px;font-weight:bold">🎬 ${title}</p><p style="margin:4px 0;color:#555;font-size:13px">${meta}</p>${
    info.overview ? `<p style="margin:6px 0;font-size:13px">📝 ${escapeHtml(truncate(info.overview, 220))}</p>` : ""
  }<p style="margin:6px 0;font-size:13px">🔗 <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>${
    links.series
      ? `<p style="margin:6px 0;font-size:13px">📂 ${escapeHtml(l.allEpisodes)}: <a href="${escapeHtml(links.series)}">${escapeHtml(links.series)}</a></p>`
      : ""
  }${
    links.trailer
      ? `<p style="margin:6px 0;font-size:13px">🎥 ${escapeHtml(l.trailer)}: <a href="${escapeHtml(links.trailer)}">${escapeHtml(links.trailer)}</a></p>`
      : ""
  }<p style="margin:6px 0 0;font-size:13px">🍿 ${escapeHtml(l.footer)}</p></td></tr></table>`;
}

/** Copies the rich version when the browser allows it, plain text otherwise. */
/**
 * Copies content that may still be loading (short links being created):
 * passing promises to ClipboardItem keeps the click's permission while we
 * wait — needed by Safari. Falls back to waiting, then copyShare().
 */
export async function copyShareWhenReady(content: Promise<{ text: string; html: string }>) {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": content.then(({ text }) => new Blob([text], { type: "text/plain" })),
          "text/html": content.then(({ html }) => new Blob([html], { type: "text/html" })),
        }),
      ]);
      return true;
    }
  } catch {
    // browsers without promise support in ClipboardItem: below
  }
  const { text, html } = await content;
  return copyShare(text, html);
}

async function copyShare(text: string, html: string) {
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
