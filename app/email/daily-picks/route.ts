import { isLocale } from "@/i18n/config";
import { renderDailyPicksEmail } from "@/lib/emails/daily-picks-email";
import { dailyPicksWebUrl, loadDailyPicksContent, unsubscribeMailto } from "@/lib/emails/daily-picks-content";

/**
 * Hosted copy of the daily picks email: /email/daily-picks?m=<movie>&d=<drama>&a=<anime>&lang=fr
 *
 * Used for "View in browser" and as the language switch in inboxes that
 * can't run the interactive one (Gmail, Outlook). Contains no personal
 * data — only the TMDB titles referenced in the URL.
 */
const ID_RE = /^\d{1,10}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const m = url.searchParams.get("m") ?? "";
  const d = url.searchParams.get("d");
  const a = url.searchParams.get("a");
  const langParam = url.searchParams.get("lang");
  const locale = isLocale(langParam) ? langParam : "en";

  if (!ID_RE.test(m) || (d && !ID_RE.test(d)) || (a && !ID_RE.test(a))) {
    return new Response("Invalid link", { status: 400 });
  }

  const ids = { movie: m, drama: d, anime: a };
  const content = await loadDailyPicksContent(ids);
  if (!content) return new Response("This email is no longer available.", { status: 404 });

  const domain = process.env.NEXT_PUBLIC_DOMAIN || url.origin;
  const { html } = renderDailyPicksEmail({
    locale,
    content,
    domain,
    webVersionUrl: (l) => dailyPicksWebUrl(domain, ids, l),
    unsubscribeUrl: unsubscribeMailto,
    isWebVersion: true,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
