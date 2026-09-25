import { createTranslator } from "next-intl";
import { localeMeta, locales, type Locale } from "@/i18n/config";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import type { Movie } from "@/typing";

/**
 * "Daily picks" newsletter template — English & French, with a language
 * switch inside the email.
 *
 * Built for real inboxes: table layout, inline styles, bulletproof buttons,
 * hidden preheader, dark-mode meta, plain-text part, mobile stacking.
 *
 * Language switch (progressive enhancement):
 * - Both languages are rendered in the email. The recipient's language is
 *   visible; the other is hidden with inline `display:none` (+ `mso-hide`).
 * - Interactive clients (Apple Mail, iOS Mail, Thunderbird, Samsung Mail,
 *   Outlook.com / new Outlook, most webviews) support hidden radio inputs +
 *   `:checked`: the EN / FR pills toggle the content instantly, inside the
 *   email, no network request.
 * - Clients that strip form elements (Gmail, Outlook desktop, Yahoo) keep
 *   the fallback: the pills become links to the hosted web version of the
 *   same email in the other language (app/email/daily-picks/route.ts).
 * - Support is detected in CSS: `.lf-radio:checked` only matches where the
 *   radio inputs survived, and that's what swaps labels ↔ links.
 */

export interface DailyPick {
  item: Movie;
  kind: "movie" | "k-drama" | "anime";
}

/** The picks, with TMDB titles/overviews in one language. */
interface LocalizedPicks {
  hero: DailyPick;
  more: DailyPick[];
}

/** Same picks in every supported language (see lib/emails/daily-picks-content.ts). */
export type DailyPicksContent = Record<Locale, LocalizedPicks>;

interface DailyPicksEmailInput {
  /** Recipient's language: subject, preheader and the version shown first. */
  locale: Locale;
  /** Same picks, localised per language (TMDB title / overview). */
  content: DailyPicksContent;
  firstName?: string;
  /** Absolute site URL, e.g. https://luminaflix.app */
  domain: string;
  /** Hosted copy of this email in a given language (used as the Gmail/Outlook fallback). */
  webVersionUrl: (locale: Locale) => string;
  /** Where "Unsubscribe" points (mailto: or URL), per language. */
  unsubscribeUrl: (locale: Locale) => string;
  /** Rendering the hosted web version (hides "View in browser", adds noindex). */
  isWebVersion?: boolean;
  now?: Date;
}

interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

// ------------------------------------------------------------------ utils --

const MESSAGES = { en, fr: fr as typeof en } satisfies Record<Locale, typeof en>;

const translatorFor = (locale: Locale) =>
  createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails.dailyPicks" });
type T = ReturnType<typeof translatorFor>;

const BRAND = "#06b6d4";
const BG = "#050505";
const CARD = "#0e0e11";
const BORDER = "#1f1f25";
const MUTED = "#a1a1aa";
const FAINT = "#71717a";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const TMDB_IMG = "https://image.tmdb.org/t/p";

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

const truncate = (text: string | undefined, max: number) => {
  const clean = (text ?? "").trim();
  return clean.length > max ? `${clean.slice(0, max).replace(/\s+\S*$/, "")}…` : clean;
};

const titleOf = (item: Movie) => item.title || item.name || "Untitled";
const yearOf = (item: Movie) => (item.release_date || item.first_air_date || "").slice(0, 4);
const ratingOf = (item: Movie, locale: Locale) =>
  item.vote_average
    ? item.vote_average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "";

const KIND_KEY = { movie: "movie", "k-drama": "kdrama", anime: "anime" } as const;
const KIND_PATH: Record<DailyPick["kind"], string> = { movie: "movies", "k-drama": "k-drama", anime: "anime" };

/** Adds UTM tags so visits from the email show up in analytics. */
function trackedUrl(domain: string, path: string, content: string, locale: Locale) {
  const url = new URL(path, domain);
  url.searchParams.set("utm_source", "newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "daily_picks");
  url.searchParams.set("utm_content", `${content}_${locale}`);
  return url.toString();
}

function button(href: string, label: string, variant: "primary" | "ghost" = "primary") {
  const primary = variant === "primary";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr>
    <td align="center" bgcolor="${primary ? BRAND : CARD}" style="border-radius:12px;${primary ? "" : `border:1px solid #3f3f46;`}">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:14px;font-weight:700;line-height:1;color:${primary ? "#000000" : "#ffffff"};text-decoration:none;border-radius:12px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function metaLine(item: Movie, kind: DailyPick["kind"], t: T, locale: Locale) {
  const parts = [
    `<span style="color:${BRAND};font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(t(`kind.${KIND_KEY[kind]}`))}</span>`,
  ];
  const year = yearOf(item);
  const rating = ratingOf(item, locale);
  if (year) parts.push(escapeHtml(year));
  if (rating) parts.push(`<span style="color:#facc15;">&#9733;</span>&nbsp;${rating}`);
  return parts.join(`<span style="color:#3f3f46;">&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>`);
}

// ---------------------------------------------------------- lang switch --

const radioId = (locale: Locale) => `lf-lang-${locale}`;

/**
 * EN | FR pills. The current language is a static "active" pill; every other
 * language is rendered twice: a <label> (interactive clients) and a link to
 * the web version (fallback). CSS shows exactly one of the two.
 */
function languageSwitch(current: Locale, input: DailyPicksEmailInput, t: T) {
  const pills = locales
    .map((locale) => {
      const short = localeMeta[locale].short;
      const pill =
        "display:inline-block;padding:6px 11px;border-radius:999px;font-family:" +
        FONT +
        ";font-size:11px;font-weight:800;letter-spacing:1px;line-height:1;text-decoration:none;";
      if (locale === current) {
        return `<span style="${pill}background:${BRAND};color:#000000;">${short}</span>`;
      }
      const title = escapeHtml(localeMeta[locale].nativeName);
      return `<label for="${radioId(locale)}" class="lf-toggle" title="${title}" style="${pill}color:#d4d4d8;cursor:pointer;display:none;mso-hide:all;">${short}</label><a href="${input.webVersionUrl(locale)}" target="_blank" class="lf-fallback" title="${title}" style="${pill}color:#d4d4d8;">${short}</a>`;
    })
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
  <tr>
    <td style="padding:3px;border:1px solid #27272a;border-radius:999px;" aria-label="${escapeHtml(t("language"))}">${pills}</td>
  </tr>
</table>`;
}

// ------------------------------------------------------------- sections --

function heroSection(pick: DailyPick, domain: string, t: T, locale: Locale) {
  const { item, kind } = pick;
  const title = escapeHtml(titleOf(item));
  const watch = trackedUrl(domain, `/${KIND_PATH[kind]}/${item.id}`, "hero_watch", locale);
  const trailer = trackedUrl(
    domain,
    `/trailer/${item.id}?type=${kind === "movie" ? "movie" : kind === "anime" ? "anime" : "tv"}&lang=${locale}`,
    "hero_trailer",
    locale,
  );
  const image = item.backdrop_path || item.poster_path;

  return `<tr>
  <td style="padding:0 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD}" style="background:${CARD};border:1px solid ${BORDER};border-radius:20px;">
      ${
        image
          ? `<tr><td style="padding:0;">
        <a href="${watch}" target="_blank" style="text-decoration:none;">
          <img src="${TMDB_IMG}/w780${image}" width="550" alt="${title}" style="display:block;width:100%;max-width:550px;height:auto;border:0;border-radius:20px 20px 0 0;" />
        </a>
      </td></tr>`
          : ""
      }
      <tr>
        <td style="padding:24px 24px 18px 24px;font-family:${FONT};">
          <p style="margin:0 0 10px 0;font-size:11px;color:${MUTED};">${metaLine(item, kind, t, locale)}</p>
          <h2 style="margin:0 0 10px 0;font-size:26px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${title}</h2>
          <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:${MUTED};">${escapeHtml(truncate(item.overview, 190))}</p>
          ${button(watch, `&#9654;&nbsp; ${escapeHtml(t("watchNow"))}`)}${button(trailer, escapeHtml(t("trailer")), "ghost")}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function card(pick: DailyPick, domain: string, index: number, t: T, locale: Locale) {
  const { item, kind } = pick;
  const title = escapeHtml(titleOf(item));
  const href = trackedUrl(domain, `/${KIND_PATH[kind]}/${item.id}`, `card_${index + 1}`, locale);
  const image = item.poster_path || item.backdrop_path;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARD}" style="background:${CARD};border:1px solid ${BORDER};border-radius:18px;">
  ${
    image
      ? `<tr><td style="padding:10px 10px 0 10px;">
    <a href="${href}" target="_blank" style="text-decoration:none;">
      <img class="poster" src="${TMDB_IMG}/w342${image}" width="250" alt="${title}" style="display:block;width:100%;height:auto;border:0;border-radius:12px;" />
    </a>
  </td></tr>`
      : ""
  }
  <tr>
    <td style="padding:14px 16px 18px 16px;font-family:${FONT};">
      <p style="margin:0 0 6px 0;font-size:10px;color:${MUTED};">${metaLine(item, kind, t, locale)}</p>
      <h3 class="card-title" style="margin:0 0 12px 0;height:42px;overflow:hidden;font-size:16px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</h3>
      <a href="${href}" target="_blank" style="font-size:13px;font-weight:700;color:${BRAND};text-decoration:none;">${escapeHtml(t("startWatching"))} &rarr;</a>
    </td>
  </tr>
</table>`;
}

function moreSection(picks: DailyPick[], domain: string, t: T, locale: Locale) {
  if (picks.length === 0) return "";
  const cells = picks
    .slice(0, 2)
    .map(
      (pick, i) =>
        `<td class="stack" width="50%" valign="top" style="padding:${i === 0 ? "0 8px 0 0" : "0 0 0 8px"};">${card(pick, domain, i, t, locale)}</td>`,
    )
    .join("");

  return `<tr>
  <td style="padding:36px 24px 14px 24px;font-family:${FONT};">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${FAINT};">${escapeHtml(t("alsoTonight"))}</p>
  </td>
</tr>
<tr>
  <td style="padding:0 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
  </td>
</tr>`;
}

function browseSection(domain: string, t: T, locale: Locale) {
  const links = [
    ["movies", "/movies"],
    ["tvShows", "/tv-shows"],
    ["anime", "/anime"],
    ["kdrama", "/k-drama"],
    ["newPopular", "/new-popular"],
  ] as const;
  const pills = links
    .map(
      ([key, path]) =>
        `<a href="${trackedUrl(domain, path, `browse_${path.slice(1)}`, locale)}" target="_blank" style="display:inline-block;margin:0 6px 8px 0;padding:9px 14px;border:1px solid #27272a;border-radius:999px;font-family:${FONT};font-size:12px;font-weight:600;color:#e4e4e7;text-decoration:none;">${escapeHtml(t(`browse.${key}`))}</a>`,
    )
    .join("");

  return `<tr>
  <td style="padding:36px 24px 0 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#07161a" style="background:#07161a;border:1px solid #0e3a44;border-radius:20px;">
      <tr>
        <td style="padding:28px 24px;font-family:${FONT};">
          <h3 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;font-weight:800;color:#ffffff;">${escapeHtml(t("bannerTitle"))}</h3>
          <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:${MUTED};">${escapeHtml(t("bannerBody"))}</p>
          ${button(trackedUrl(domain, "/", "banner_open", locale), escapeHtml(t("openApp")))}
          <div style="margin-top:12px;">${pills}</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/** The whole email body in one language. */
function renderBody(locale: Locale, input: DailyPicksEmailInput, now: Date) {
  const t = translatorFor(locale);
  const { domain } = input;
  const { hero, more } = input.content[locale];
  const name = (input.firstName ?? "").trim();
  const dateLabel = now.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  const greeting = name ? t("greetingNamed", { name }) : t("greeting");

  return `<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" align="center" style="width:600px;max-width:600px;margin:0 auto;">

  <!-- Header -->
  <tr>
    <td style="padding:0 24px 28px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="font-family:${FONT};font-size:22px;font-weight:900;font-style:italic;letter-spacing:-0.5px;color:#ffffff;">
          <a href="${trackedUrl(domain, "/", "logo", locale)}" target="_blank" style="color:#ffffff;text-decoration:none;">LUMINA<span style="color:${BRAND};">FLIX</span></a>
        </td>
        <td valign="middle" align="right" style="font-family:${FONT};font-size:12px;color:${FAINT};white-space:nowrap;">
          <span class="hide-mobile" style="padding-right:10px;">${escapeHtml(dateLabel)}</span>${languageSwitch(locale, input, t)}
        </td>
      </tr></table>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:0 24px 24px 24px;font-family:${FONT};">
      <p style="margin:0 0 10px 0;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${BRAND};">${escapeHtml(t("eyebrow"))}</p>
      <h1 class="h1" style="margin:0 0 10px 0;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-1px;color:#ffffff;">${escapeHtml(greeting)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:${MUTED};">${escapeHtml(t("intro", { count: 1 + more.length }))}</p>
    </td>
  </tr>

  ${heroSection(hero, domain, t, locale)}
  ${moreSection(more, domain, t, locale)}
  ${browseSection(domain, t, locale)}

  <!-- Footer -->
  <tr>
    <td style="padding:36px 24px 0 24px;font-family:${FONT};text-align:center;">
      <p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:${FAINT};">
        <a href="${trackedUrl(domain, "/favorites", "footer_favorites", locale)}" target="_blank" style="color:${MUTED};text-decoration:none;">${escapeHtml(t("favorites"))}</a>
        <span style="color:#3f3f46;">&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
        <a href="${trackedUrl(domain, "/help", "footer_help", locale)}" target="_blank" style="color:${MUTED};text-decoration:none;">${escapeHtml(t("help"))}</a>
        ${
          input.isWebVersion
            ? ""
            : `<span style="color:#3f3f46;">&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
        <a href="${input.webVersionUrl(locale)}" target="_blank" style="color:${MUTED};text-decoration:none;">${escapeHtml(t("viewInBrowser"))}</a>`
        }
        <span style="color:#3f3f46;">&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
        <a href="${escapeHtml(input.unsubscribeUrl(locale))}" style="color:${MUTED};text-decoration:underline;">${escapeHtml(t("unsubscribe"))}</a>
      </p>
      <p style="margin:0 0 6px 0;font-size:11px;line-height:1.6;color:#52525b;">${escapeHtml(t("reason"))}</p>
      <p style="margin:0;font-size:11px;line-height:1.6;color:#52525b;">${escapeHtml(t("attribution"))} &copy; ${now.getFullYear()} LuminaFlix</p>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------- render --

function subjectAndPreheader(locale: Locale, input: DailyPicksEmailInput, now: Date) {
  const t = translatorFor(locale);
  const { hero, more } = input.content[locale];
  const name = (input.firstName ?? "").trim();
  const title = truncate(titleOf(hero.item), 38);
  const weekday = now.toLocaleDateString(locale, { weekday: "long" });
  const count = more.length;

  const subjects = name
    ? [
        t("subjectNamed1", { name, title }),
        t("subjectNamed2", { name, title, count }),
        t("subjectNamed3", { name, weekday }),
      ]
    : [t("subject1", { title }), t("subject2", { title, count }), t("subject3", { weekday })];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];

  const others = new Intl.ListFormat(locale, { type: "conjunction" }).format(more.map((p) => titleOf(p.item)));
  const preheader = more.length
    ? t("preheader", { title: titleOf(hero.item), others })
    : t("preheaderSolo", { title: titleOf(hero.item) });

  return { subject, preheader };
}

function renderText(locale: Locale, input: DailyPicksEmailInput) {
  const t = translatorFor(locale);
  const { hero, more } = input.content[locale];
  const { domain } = input;
  const name = (input.firstName ?? "").trim();
  const year = yearOf(hero.item);
  return [
    name ? t("greetingNamed", { name }) : t("greeting"),
    "",
    `${t("textPick")} — ${t(`kind.${KIND_KEY[hero.kind]}`)}: ${titleOf(hero.item)}${year ? ` (${year})` : ""}`,
    truncate(hero.item.overview, 190),
    `${t("textWatch")} ${trackedUrl(domain, `/${KIND_PATH[hero.kind]}/${hero.item.id}`, "hero_watch_text", locale)}`,
    "",
    ...more.flatMap((p, i) => [
      `${t(`kind.${KIND_KEY[p.kind]}`)}: ${titleOf(p.item)}`,
      trackedUrl(domain, `/${KIND_PATH[p.kind]}/${p.item.id}`, `card_${i + 1}_text`, locale),
      "",
    ]),
    `${t("textOpen")} ${trackedUrl(domain, "/", "banner_open_text", locale)}`,
    ...locales.filter((l) => l !== locale).map((l) => `${localeMeta[l].nativeName}: ${input.webVersionUrl(l)}`),
    "",
    `${t("textUnsubscribe")} ${input.unsubscribeUrl(locale)}`,
  ].join("\n");
}

export function renderDailyPicksEmail(input: DailyPicksEmailInput): RenderedEmail {
  const now = input.now ?? new Date();
  const primary = input.locale;
  const { subject, preheader } = subjectAndPreheader(primary, input, now);

  // Recipient's language first and visible; the others hidden until toggled.
  const ordered = [primary, ...locales.filter((l) => l !== primary)];

  const radios = ordered
    .map(
      (locale) =>
        `<input type="radio" name="lf-lang" id="${radioId(locale)}" class="lf-radio"${locale === primary ? ' checked="checked"' : ""} style="display:none !important;max-height:0;visibility:hidden;mso-hide:all;" />`,
    )
    .join("\n  ");

  const bodies = ordered
    .map((locale) => {
      const hidden = locale !== primary;
      return `<div class="lf-body lf-body-${locale}" lang="${locale}" style="${hidden ? "display:none;max-height:0;overflow:hidden;mso-hide:all;" : ""}">
${renderBody(locale, input, now)}
</div>`;
    })
    .join("\n");

  // Kept in its own <style> block: if a client rejects these selectors, it
  // doesn't take the responsive rules down with it.
  const interactiveCss = [
    // Support detection: radios survived → labels on, fallback links off.
    `.lf-radio:checked ~ .lf-wrap .lf-toggle { display:inline-block !important; }`,
    `.lf-radio:checked ~ .lf-wrap .lf-fallback { display:none !important; }`,
    // Show only the checked language.
    ...locales.map(
      (l) =>
        `#${radioId(l)}:checked ~ .lf-wrap .lf-body { display:none !important; } #${radioId(l)}:checked ~ .lf-wrap .lf-body-${l} { display:block !important; max-height:none !important; overflow:visible !important; }`,
    ),
  ].join("\n    ");

  const html = `<!DOCTYPE html>
<html lang="${primary}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  ${input.isWebVersion ? '<meta name="robots" content="noindex" />' : ""}
  <title>${escapeHtml(input.isWebVersion ? translatorFor(primary)("webTitle") : subject)}</title>
  <style>
    body { margin:0; padding:0; background:${BG}; }
    a { color:${BRAND}; }
    @media only screen and (max-width: 600px) {
      .container { width:100% !important; }
      .stack { display:block !important; width:100% !important; padding:0 0 16px 0 !important; }
      .h1 { font-size:26px !important; }
      .poster { width:60% !important; margin:0 auto !important; }
      .card-title { height:auto !important; }
      .hide-mobile { display:none !important; }
    }
  </style>
  <style>
    ${interactiveCss}
  </style>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <!-- Preheader: the grey preview line in the inbox -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>

  ${radios}
  <div class="lf-wrap" style="background:${BG};padding:32px 12px;">
${bodies}
  </div>
</body>
</html>`;

  return { subject, preheader, html, text: renderText(primary, input) };
}