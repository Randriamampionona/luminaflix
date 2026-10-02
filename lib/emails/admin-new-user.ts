import { EMAIL, emailDocument, emailLogo, escapeHtml } from "./ui";

export interface RegisteredUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string | null;
  createdAt: Date;
  locale: "fr" | "en";
}

/** "[Lumina] New User Registration: {fullName}" — internal alert for the team. */
export function renderAdminNewUserEmail(user: RegisteredUser, domain: string) {
  const name = user.fullName || user.email || user.id;
  const registeredAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  }).format(user.createdAt);

  const rows: [string, string][] = [
    ["Full name", user.fullName || "—"],
    ["Email", user.email || "—"],
    ["User ID", user.id],
    ["Registered", `${registeredAt} (Paris)`],
    ["Language", user.locale === "fr" ? "Français" : "English"],
  ];

  const avatar = user.imageUrl
    ? `<img src="${escapeHtml(user.imageUrl)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:50%;border:3px solid ${EMAIL.brand};object-fit:cover;" />`
    : `<div style="width:72px;height:72px;border-radius:50%;background:${EMAIL.brand};color:#000000;font:900 26px/72px ${EMAIL.font};text-align:center;">${escapeHtml((name[0] ?? "?").toUpperCase())}</div>`;

  const body = `
          <tr><td style="padding:0 24px 24px 24px;">${emailLogo(domain)}</td></tr>
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL.card}" style="background:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:20px;">
                <tr>
                  <td style="padding:24px 24px 8px 24px;font-family:${EMAIL.font};">
                    <p style="margin:0 0 6px 0;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${EMAIL.brand};">New registration</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td valign="middle" style="padding:8px 16px 8px 0;">${avatar}</td>
                      <td valign="middle" style="font-family:${EMAIL.font};">
                        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">${escapeHtml(name)}</p>
                        <p style="margin:4px 0 0 0;font-size:14px;color:${EMAIL.muted};">${escapeHtml(user.email)}</p>
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 24px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${EMAIL.border};">
                      ${rows
                        .map(
                          ([label, value]) => `<tr>
                        <td style="padding:12px 0;border-bottom:1px solid ${EMAIL.border};font-family:${EMAIL.font};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${EMAIL.faint};width:120px;">${label}</td>
                        <td style="padding:12px 0;border-bottom:1px solid ${EMAIL.border};font-family:${EMAIL.font};font-size:14px;color:#ffffff;word-break:break-all;">${escapeHtml(value)}</td>
                      </tr>`,
                        )
                        .join("")}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:${EMAIL.font};font-size:11px;color:#52525b;text-align:center;">
              Automatic alert from the LuminaFlix Clerk webhook.
            </td>
          </tr>`;

  return {
    subject: `[Lumina] New User Registration: ${name}`,
    html: emailDocument({ lang: "en", title: `New user: ${name}`, preheader: `${name} (${user.email}) just signed up.`, body }),
    text: [
      `New user registration on LuminaFlix`,
      "",
      ...rows.map(([label, value]) => `${label}: ${value}`),
      ...(user.imageUrl ? [`Avatar: ${user.imageUrl}`] : []),
    ].join("\n"),
  };
}