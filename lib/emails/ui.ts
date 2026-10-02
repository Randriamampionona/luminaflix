/**
 * Shared building blocks for transactional emails (welcome, admin alerts).
 * Inbox-safe: tables, inline styles, no flex/position/shadows.
 */
export const EMAIL = {
  brand: "#06b6d4",
  bg: "#050505",
  card: "#0e0e11",
  border: "#1f1f25",
  muted: "#a1a1aa",
  faint: "#71717a",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

export const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/** Absolute URL with UTM tags so visits from emails show up in analytics. */
export function trackedUrl(domain: string, path: string, campaign: string, content: string) {
  const url = new URL(path, domain);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", content);
  return url.toString();
}

export function emailButton(href: string, label: string, variant: "primary" | "ghost" = "primary") {
  const primary = variant === "primary";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:0 8px 8px 0;">
  <tr>
    <td align="center" bgcolor="${primary ? EMAIL.brand : EMAIL.card}" style="border-radius:12px;${primary ? "" : "border:1px solid #3f3f46;"}">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${EMAIL.font};font-size:14px;font-weight:700;line-height:1;color:${primary ? "#000000" : "#ffffff"};text-decoration:none;border-radius:12px;">${label}</a>
    </td>
  </tr>
</table>`;
}

export function emailLogo(href: string) {
  return `<a href="${href}" target="_blank" style="font-family:${EMAIL.font};font-size:22px;font-weight:900;font-style:italic;letter-spacing:-0.5px;color:#ffffff;text-decoration:none;">LUMINA<span style="color:${EMAIL.brand};">FLIX</span></a>`;
}

/** Full HTML document: dark background, 600px column, hidden preheader. */
export function emailDocument({
  lang,
  title,
  preheader,
  body,
}: {
  lang: string;
  title: string;
  preheader: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin:0; padding:0; background:${EMAIL.bg}; }
    a { color:${EMAIL.brand}; }
    @media only screen and (max-width: 600px) {
      .container { width:100% !important; }
      .stack { display:block !important; width:100% !important; padding:0 0 12px 0 !important; }
      .h1 { font-size:26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${EMAIL.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.bg}" style="background:${EMAIL.bg};">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
${body}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}