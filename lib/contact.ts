/**
 * Contact form rules, shared by the client form (inline validation) and the
 * server action (authoritative validation). No server-only imports here.
 */
export const CONTACT_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  subject: { min: 3, max: 150 },
  message: { min: 20, max: 5000 },
} as const;

/** Wait time between two messages (enforced in the browser *and* per IP on the server). */
export const CONTACT_COOLDOWN_SECONDS = 120;

export type ContactField = "name" | "email" | "subject" | "message";
export type ContactValues = Record<ContactField, string>;

/** Keys under `contact.errors.*`. */
export type ContactFieldError = "required" | ContactField | "captcha" | "captchaExpired";
export type ContactErrors = Partial<Record<ContactField | "captcha", ContactFieldError>>;

/** A math question rendered as an image, plus the signed token that proves the answer. */
export interface ContactChallenge {
  token: string;
  /** data:image/svg+xml URI — the digits are drawn as shapes, not text. */
  image: string;
}

export type ContactFormState =
  | { status: "idle" }
  | {
      status: "success";
      name: string;
      email: string;
      cooldownSeconds: number;
      challenge: ContactChallenge;
    }
  | {
      status: "error";
      /** Keys under `contact.errors.*` ("cooldown" is rendered with a countdown instead). */
      error: "fixFields" | "captcha" | "cooldown" | "rateLimited" | "spam" | "config" | "server";
      fieldErrors?: ContactErrors;
      values?: Partial<ContactValues>;
      /** Seconds until the next message is allowed (error "cooldown"). */
      retryAfter?: number;
      /** Every response carries a fresh question: each one can be used only once. */
      challenge: ContactChallenge;
    };

// Pragmatic check: one @, no spaces, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeContact(input: Partial<Record<ContactField, unknown>>): ContactValues {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    name: str(input.name).trim().replace(/\s+/g, " "),
    email: str(input.email).trim().toLowerCase(),
    subject: str(input.subject).trim().replace(/\s+/g, " "),
    message: str(input.message).trim().replace(/\r\n/g, "\n"),
  };
}

export function validateContactField(field: ContactField, value: string): ContactFieldError | undefined {
  if (!value) return "required";
  switch (field) {
    case "name":
      return value.length < CONTACT_LIMITS.name.min || value.length > CONTACT_LIMITS.name.max ? "name" : undefined;
    case "email":
      return value.length > CONTACT_LIMITS.email.max || !EMAIL_RE.test(value) ? "email" : undefined;
    case "subject":
      return value.length < CONTACT_LIMITS.subject.min || value.length > CONTACT_LIMITS.subject.max
        ? "subject"
        : undefined;
    case "message":
      return value.length < CONTACT_LIMITS.message.min || value.length > CONTACT_LIMITS.message.max
        ? "message"
        : undefined;
  }
}

/** The captcha answer must be a small whole number. */
export function validateCaptchaAnswer(value: string): ContactFieldError | undefined {
  if (!value.trim()) return "required";
  return /^\d{1,3}$/.test(value.trim()) ? undefined : "captcha";
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of ["name", "email", "subject", "message"] as const) {
    const error = validateContactField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

/** 125 → "2:05" */
export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}