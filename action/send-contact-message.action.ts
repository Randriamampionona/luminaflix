"use server";

import { BrevoClient, BrevoError } from "@getbrevo/brevo";
import { headers } from "next/headers";
import {
  CONTACT_COOLDOWN_SECONDS,
  normalizeContact,
  validateCaptchaAnswer,
  validateContact,
  type ContactChallenge,
  type ContactFormState,
} from "@/lib/contact";
import { createContactChallenge, verifyContactChallenge } from "@/lib/contact-captcha";

/**
 * Contact form → transactional email via Brevo (already used by the daily
 * digest, so no new provider or API key is needed).
 *
 * Env:
 * - BREVO_API_KEY       (required)
 * - CONTACT_TO_EMAIL    recipient, defaults to tojorandria474@gmail.com
 * - CONTACT_FROM_EMAIL  sender; must be a sender verified in Brevo
 *
 * - CONTACT_CAPTCHA_SECRET (optional) signs the math captcha, see lib/contact-captcha.ts
 *
 * Abuse protection: hidden honeypot field, minimum fill time, math captcha,
 * a cooldown between messages (also shown as a countdown in the browser),
 * per-IP rate limit, strict length limits and HTML escaping. The recipient
 * address is never sent to the browser.
 */
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "tojorandria474@gmail.com";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "tojorandria474@gmail.com";
const FROM_NAME = "LuminaFlix Contact";

const MIN_FILL_MS = 3000;
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };

// Best-effort, per server instance. Use Upstash/Redis for a global limit.
const hits = new Map<string, number[]>();
const lastSent = new Map<string, number>();

/** Seconds left before this IP may send again (0 = allowed). */
function cooldownRemaining(ip: string) {
  const sentAt = lastSent.get(ip);
  if (!sentAt) return 0;
  const left = CONTACT_COOLDOWN_SECONDS * 1000 - (Date.now() - sentAt);
  return left > 0 ? Math.ceil(left / 1000) : 0;
}

function recordSent(ip: string) {
  const now = Date.now();
  lastSent.set(ip, now);
  if (lastSent.size > 5000) {
    for (const [k, t] of lastSent) if (now - t > CONTACT_COOLDOWN_SECONDS * 1000) lastSent.delete(k);
  }
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= RATE_LIMIT.windowMs)) hits.delete(k);
  }
  return false;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

/**
 * Maps Brevo failures to a user-facing code and a log line that says what to
 * fix. Config problems (bad key, unverified sender, IP blocking) are reported
 * as "config" so users see "temporarily unavailable" rather than "try again".
 */
function describeBrevoError(error: unknown): { code: "config" | "server"; detail: string } {
  if (error instanceof BrevoError) {
    const body = error.body as { code?: string; message?: string } | undefined;
    const message = body?.message ?? error.message;
    const status = error.statusCode;
    if (status === 401) {
      return {
        code: "config",
        detail: `401 ${message}. Check BREVO_API_KEY, and if "Authorised IPs" is enabled in Brevo (Security settings), add your server's IP or disable the restriction.`,
      };
    }
    if (status === 400 && /sender/i.test(message)) {
      return {
        code: "config",
        detail: `400 ${message}. CONTACT_FROM_EMAIL (${FROM_EMAIL}) must be a verified sender in Brevo (Senders, Domains & Dedicated IPs).`,
      };
    }
    if (status === 403)
      return {
        code: "config",
        detail: `403 ${message}. The Brevo account may be suspended or not activated for transactional email.`,
      };
    return { code: "server", detail: `${status ?? "?"} ${message}` };
  }
  return { code: "server", detail: error instanceof Error ? error.message : String(error) };
}

/** A fresh captcha, for the "new question" button. */
export async function getContactChallenge(): Promise<ContactChallenge> {
  return createContactChallenge();
}

export async function sendContactMessage(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Each response carries a new question: a token can only be used once.
  const challenge = createContactChallenge();
  const captchaToken = String(formData.get("captchaToken") ?? "");
  const captchaAnswer = String(formData.get("captchaAnswer") ?? "");

  const values = normalizeContact({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  // Bots fill every field and submit instantly.
  const honeypot = formData.get("lf_hp_field");
  const startedAt = Number(formData.get("startedAt"));
  const spamReason =
    typeof honeypot === "string" && honeypot.length > 0
      ? "honeypot filled"
      : !startedAt
        ? "missing start time (form submitted before hydration)"
        : Date.now() - startedAt < MIN_FILL_MS
          ? "submitted too fast"
          : null;
  if (spamReason) {
    console.warn(`[contact] rejected by spam filter: ${spamReason}`);
    return { status: "error", error: "spam", values, challenge };
  }

  const fieldErrors = validateContact(values);
  const captchaError = validateCaptchaAnswer(captchaAnswer);
  if (captchaError) fieldErrors.captcha = captchaError;
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", error: "fixFields", fieldErrors, values, challenge };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  // Server-side twin of the browser countdown (localStorage can be cleared).
  const retryAfter = cooldownRemaining(ip);
  if (retryAfter > 0) {
    return { status: "error", error: "cooldown", retryAfter, values, challenge };
  }
  if (isRateLimited(ip)) {
    return { status: "error", error: "rateLimited", values, challenge };
  }

  const captcha = verifyContactChallenge(captchaToken, captchaAnswer);
  if (captcha !== "ok") {
    return {
      status: "error",
      error: "captcha",
      fieldErrors: { captcha: captcha === "expired" ? "captchaExpired" : "captcha" },
      values,
      challenge,
    };
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[contact] BREVO_API_KEY is not set");
    return { status: "error", error: "config", values, challenge };
  }

  const locale = h.get("accept-language")?.split(",")[0] ?? "unknown";
  const safe = {
    name: escapeHtml(values.name),
    email: escapeHtml(values.email),
    subject: escapeHtml(values.subject),
    message: escapeHtml(values.message).replace(/\n/g, "<br>"),
  };

  const htmlContent = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#000;padding:20px 24px;color:#fff;font-size:18px;font-weight:bold">
      Lumina<span style="color:#06b6d4">Flix</span> · New contact message
    </td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">From</p>
      <p style="margin:0 0 16px;font-size:15px"><strong>${safe.name}</strong> &lt;<a href="mailto:${safe.email}">${safe.email}</a>&gt;</p>
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">Subject</p>
      <p style="margin:0 0 16px;font-size:15px">${safe.subject}</p>
      <p style="margin:0 0 4px;font-size:12px;color:#71717a;text-transform:uppercase">Message</p>
      <div style="font-size:15px;line-height:1.6;padding:16px;background:#fafafa;border-left:3px solid #06b6d4">${safe.message}</div>
      <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa">Reply directly to this email to answer ${safe.name}. · Browser language: ${escapeHtml(locale)}</p>
    </td></tr>
  </table>
</body></html>`;

  const textContent = `New contact message (LuminaFlix)

From: ${values.name} <${values.email}>
Subject: ${values.subject}

${values.message}`;

  try {
    const brevo = new BrevoClient({ apiKey });
    await brevo.transactionalEmails.sendTransacEmail({
      subject: `[LuminaFlix Contact] ${values.subject}`,
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: TO_EMAIL, name: "LuminaFlix" }],
      replyTo: { email: values.email, name: values.name },
      htmlContent,
      textContent,
    });
    recordSent(ip);
    return {
      status: "success",
      name: values.name,
      email: values.email,
      cooldownSeconds: CONTACT_COOLDOWN_SECONDS,
      challenge,
    };
  } catch (error) {
    const { code, detail } = describeBrevoError(error);
    console.error(`[contact] Brevo send failed (${code}): ${detail}`);
    return { status: "error", error: code, values, challenge };
  }
}