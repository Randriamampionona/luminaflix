import { EMAIL, emailButton, emailDocument, emailLogo, escapeHtml, trackedUrl } from "./ui";

/** "🎉 {title} is now available in VF / VOSTFR" — sent to users who clicked "Notify me". */
export function renderTitleAvailableEmail({
  locale,
  name,
  title,
  langs,
  url,
  poster,
  domain,
}: {
  locale: "fr" | "en";
  name: string | null;
  title: string;
  langs: string;
  url: string;
  poster: string;
  domain: string;
}) {
  const fr = locale === "fr";
  const watch = trackedUrl(domain, new URL(url).pathname + new URL(url).search, "notify-available", "watch");
  const subject = fr ? `🎉 ${title} est disponible en ${langs}` : `🎉 ${title} is now available in ${langs}`;
  const hello = name ? (fr ? `Bonjour ${name},` : `Hi ${name},`) : fr ? "Bonjour," : "Hi,";
  const lead = fr
    ? `Bonne nouvelle : <strong style="color:#ffffff;">${escapeHtml(title)}</strong> que vous attendiez est maintenant disponible en <strong style="color:${EMAIL.brand};">${escapeHtml(langs)}</strong> sur LuminaFlix.`
    : `Good news: <strong style="color:#ffffff;">${escapeHtml(title)}</strong>, which you were waiting for, is now available in <strong style="color:${EMAIL.brand};">${escapeHtml(langs)}</strong> on LuminaFlix.`;
  const cta = fr ? "▶ Regarder maintenant" : "▶ Watch now";
  const footer = fr
    ? "Vous recevez cet e-mail car vous avez cliqué sur « Me prévenir » pour ce titre. Une seule alerte par titre."
    : "You're receiving this because you clicked “Notify me” for this title. One alert per title.";

  const body = `
<tr><td style="padding:28px 28px 8px;">${emailLogo(domain)}</td></tr>
${
  poster
    ? `<tr><td align="center" style="padding:20px 28px 0;"><a href="${watch}" target="_blank"><img src="${poster}" width="180" alt="${escapeHtml(title)}" style="display:block;width:180px;max-width:60%;border-radius:14px;border:1px solid ${EMAIL.border};" /></a></td></tr>`
    : ""
}
<tr><td style="padding:24px 28px 0;font-family:${EMAIL.font};">
  <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${EMAIL.brand};">${fr ? "Disponible" : "Now available"}</p>
  <h1 class="h1" style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:900;color:#ffffff;">${escapeHtml(title)}</h1>
  <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${EMAIL.muted};">${escapeHtml(hello)}</p>
  <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:${EMAIL.muted};">${lead}</p>
  ${emailButton(watch, cta)}
</td></tr>
<tr><td style="padding:22px 28px 28px;font-family:${EMAIL.font};font-size:12px;line-height:1.6;color:${EMAIL.faint};">${footer}</td></tr>`;

  const text = `${subject}\n\n${hello}\n${lead.replace(/<[^>]+>/g, "")}\n\n${cta}: ${watch}\n\n${footer}`;
  return { subject, html: emailDocument({ lang: locale, title: subject, preheader: subject, body }), text };
}
