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

export type ContactField = "name" | "email" | "subject" | "message";
export type ContactValues = Record<ContactField, string>;

/** Keys under `contact.errors.*`. */
export type ContactFieldError = "required" | ContactField;
export type ContactErrors = Partial<Record<ContactField, ContactFieldError>>;

export type ContactFormState =
  | { status: "idle" }
  | { status: "success"; name: string; email: string }
  | {
      status: "error";
      /** Keys under `contact.errors.*`. */
      error: "fixFields" | "rateLimited" | "spam" | "config" | "server";
      fieldErrors?: ContactErrors;
      values?: Partial<ContactValues>;
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

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const field of ["name", "email", "subject", "message"] as const) {
    const error = validateContactField(field, values[field]);
    if (error) errors[field] = error;
  }
  return errors;
}
