import { createTranslator } from "next-intl";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import type { RegisteredUser } from "./admin-new-user";
import { EMAIL, emailButton, emailDocument, emailLogo, escapeHtml, trackedUrl } from "./ui";

const MESSAGES = { en, fr: fr as typeof en };

/** Share links that work everywhere (no SDKs, plain URLs). */
function shareLinks(inviteUrl: string, message: string) {
  const u = encodeURIComponent(inviteUrl);
  const m = encodeURIComponent(message);
  const links: { label: string; color: string; border?: string; href: string }[] = [
    { label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${m}%20${u}` },
    { label: "Facebook", color: "#1877F2", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "X", color: "#000000", border: "#3f3f46", href: `https://twitter.com/intent/tweet?text=${m}&url=${u}` },
    { label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${u}&text=${m}` },
    { label: "Email", color: "#3f3f46", href: `mailto:?subject=${m}&body=${m}%20${u}` },
  ];
  return links;
}

/** Bilingual welcome email (French by default) with an invite / share block. */
export function renderWelcomeEmail(user: RegisteredUser, domain: string) {
  const locale = user.locale;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "emails.welcome" });
  const firstName = user.firstName || user.fullName.split(" ")[0] || "";
  const greeting = firstName ? t("greetingNamed", { name: firstName }) : t("greeting");

  const startUrl = trackedUrl(domain, "/", "welcome", `start_${locale}`);
  const inviteUrl = trackedUrl(domain, "/", "invite", `share_${locale}`);
  const shareMessage = t("shareMessage");

  const features = [
    ["🎬", t("feature1Title"), t("feature1Body")],
    ["❤️", t("feature2Title"), t("feature2Body")],
    ["🌍", t("feature3Title"), t("feature3Body")],
  ];

  const body = `
          <tr><td style="padding:0 24px 28px 24px;">${emailLogo(startUrl)}</td></tr>

          <!-- Hero -->
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#07161a" style="background:#07161a;border:1px solid #0e3a44;border-radius:24px;">
                <tr>
                  <td style="padding:36px 28px;font-family:${EMAIL.font};">
                    <p style="margin:0 0 12px 0;font-size:40px;line-height:1;">🎉</p>
                    <p style="margin:0 0 10px 0;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${EMAIL.brand};">${escapeHtml(t("eyebrow"))}</p>
                    <h1 class="h1" style="margin:0 0 12px 0;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-1px;color:#ffffff;">${escapeHtml(greeting)}</h1>
                    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${EMAIL.muted};">${escapeHtml(t("intro"))}</p>
                    ${emailButton(startUrl, `&#9654;&nbsp; ${escapeHtml(t("cta"))}`)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What you get -->
          <tr>
            <td style="padding:32px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${features
                    .map(
                      (
                        [icon, title, text],
                        i,
                      ) => `<td class="stack" width="33%" valign="top" style="padding:${i === 0 ? "0 6px 0 0" : i === 2 ? "0 0 0 6px" : "0 6px"};">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.card}" style="background:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:16px;">
                      <tr><td style="padding:18px 16px;font-family:${EMAIL.font};">
                        <p style="margin:0 0 8px 0;font-size:22px;line-height:1;">${icon}</p>
                        <p style="margin:0 0 4px 0;font-size:14px;font-weight:800;color:#ffffff;">${escapeHtml(title)}</p>
                        <p style="margin:0;font-size:12px;line-height:1.5;color:${EMAIL.muted};">${escapeHtml(text)}</p>
                      </td></tr>
                    </table>
                  </td>`,
                    )
                    .join("")}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invite / share -->
          <tr>
            <td style="padding:32px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.card}" style="background:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:20px;">
                <tr>
                  <td style="padding:28px 24px;font-family:${EMAIL.font};">
                    <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:#ffffff;">${escapeHtml(t("shareTitle"))}</h2>
                    <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:${EMAIL.muted};">${escapeHtml(t("shareBody"))}</p>
                    <div style="margin:0 0 18px 0;">
                      ${shareLinks(inviteUrl, shareMessage)
                        .map(
                          (s) =>
                            `<a href="${s.href}" target="_blank" style="display:inline-block;margin:0 6px 8px 0;padding:10px 16px;border-radius:999px;background:${s.color};border:1px solid ${s.border ?? s.color};font-family:${EMAIL.font};font-size:12px;font-weight:700;color:#ffffff;text-decoration:none;">${s.label}</a>`,
                        )
                        .join("")}
                    </div>
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${EMAIL.faint};">${escapeHtml(t("inviteLabel"))}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td style="padding:12px 14px;border:1px dashed #3f3f46;border-radius:12px;font-family:Menlo,Consolas,monospace;font-size:13px;color:${EMAIL.brand};word-break:break-all;">
                        <a href="${inviteUrl}" target="_blank" style="color:${EMAIL.brand};text-decoration:none;">${escapeHtml(domain.replace(/^https?:\/\//, ""))}</a>
                      </td>
                    </tr></table>
                    <p style="margin:8px 0 0 0;font-size:12px;color:${EMAIL.faint};">${escapeHtml(t("inviteHint"))}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 24px 0 24px;font-family:${EMAIL.font};text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:${EMAIL.faint};">
                <a href="${trackedUrl(domain, "/help", "welcome", "footer_help")}" target="_blank" style="color:${EMAIL.muted};text-decoration:none;">${escapeHtml(t("help"))}</a>
                <span style="color:#3f3f46;">&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
                <a href="${trackedUrl(domain, "/contact", "welcome", "footer_contact")}" target="_blank" style="color:${EMAIL.muted};text-decoration:none;">${escapeHtml(t("contact"))}</a>
              </p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#52525b;">${escapeHtml(t("reason"))} &copy; ${new Date().getFullYear()} LuminaFlix</p>
            </td>
          </tr>`;

  return {
    subject: t("subject"),
    html: emailDocument({ lang: locale, title: t("subject"), preheader: t("preheader"), body }),
    text: [
      greeting,
      "",
      t("intro"),
      `${t("cta")}: ${startUrl}`,
      "",
      t("shareTitle"),
      t("shareBody"),
      `${t("inviteLabel")}: ${inviteUrl}`,
      "",
      t("reason"),
    ].join("\n"),
  };
}