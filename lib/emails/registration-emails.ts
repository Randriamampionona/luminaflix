import "server-only";
import { BrevoClient } from "@getbrevo/brevo";
import { getDb, logFirebaseError } from "@/lib/firebase-admin";
import { renderAdminNewUserEmail, type RegisteredUser } from "./admin-new-user";
import { renderWelcomeEmail } from "./welcome-user";

/**
 * Emails sent when someone creates an account (from the Clerk webhook):
 * 1. an admin alert to ADMIN_NOTIFY_EMAIL (default tojorandria474@gmail.com)
 * 2. a bilingual welcome email to the new user (French unless they signed
 *    up with the site in English)
 *
 * Idempotent: Svix may deliver the same `user.created` event more than once,
 * so each email is marked on USERS/{id}.emails once sent and never resent.
 *
 * Env: BREVO_API_KEY (required), ADMIN_NOTIFY_EMAIL, NEWSLETTER_FROM_EMAIL /
 * CONTACT_FROM_EMAIL (verified Brevo sender), NEXT_PUBLIC_DOMAIN.
 */
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "tojorandria474@gmail.com";
const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";
const FROM_NAME = "LuminaFlix";

type EmailKey = "adminAlert" | "welcome";

async function alreadySent(userId: string, key: EmailKey) {
  const snap = await getDb().collection("USERS").doc(userId).get();
  return Boolean(snap.data()?.emails?.[key]);
}

async function markSent(userId: string, key: EmailKey) {
  await getDb()
    .collection("USERS")
    .doc(userId)
    .set({ emails: { [key]: new Date().toISOString() } }, { merge: true });
}

export async function sendRegistrationEmails(user: RegisteredUser) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[registration-emails] BREVO_API_KEY is not set");
    return;
  }
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
  const brevo = new BrevoClient({ apiKey });
  const sender = { email: FROM_EMAIL, name: FROM_NAME };

  const jobs: { key: EmailKey; send: () => Promise<unknown> }[] = [
    {
      key: "adminAlert",
      send: () => {
        const mail = renderAdminNewUserEmail(user, domain);
        return brevo.transactionalEmails.sendTransacEmail({
          subject: mail.subject,
          sender,
          to: [{ email: ADMIN_EMAIL, name: "LuminaFlix Admin" }],
          ...(user.email && { replyTo: { email: user.email, name: user.fullName || user.email } }),
          htmlContent: mail.html,
          textContent: mail.text,
          tags: ["admin-new-user"],
        });
      },
    },
  ];

  if (user.email) {
    jobs.push({
      key: "welcome",
      send: () => {
        const mail = renderWelcomeEmail(user, domain);
        return brevo.transactionalEmails.sendTransacEmail({
          subject: mail.subject,
          sender,
          to: [{ email: user.email, name: user.fullName || undefined }],
          htmlContent: mail.html,
          textContent: mail.text,
          tags: ["welcome", `welcome-${user.locale}`],
        });
      },
    });
  }

  // Independent: one failing doesn't block the other.
  await Promise.all(
    jobs.map(async ({ key, send }) => {
      try {
        if (await alreadySent(user.id, key)) return;
        await send();
        await markSent(user.id, key);
      } catch (error) {
        logFirebaseError(`registration-email:${key}`, error);
      }
    }),
  );
}