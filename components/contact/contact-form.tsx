"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendContactMessage } from "@/action/send-contact-message.action";
import {
  CONTACT_LIMITS,
  normalizeContact,
  validateContact,
  validateContactField,
  type ContactErrors,
  type ContactField,
  type ContactFormState,
  type ContactValues,
} from "@/lib/contact";
import { cn } from "@/lib/utils";

const INITIAL_STATE: ContactFormState = { status: "idle" };

const inputBase =
  "w-full rounded-2xl border bg-zinc-900/60 px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60";

interface ContactFormProps {
  defaultSubject?: string;
  /** Pre-filled from the signed-in Clerk user (see app/contact/page.tsx). */
  defaultName?: string;
  defaultEmail?: string;
}

/** Name of the hidden anti-spam field — deliberately not something browsers autofill. */
const HONEYPOT_FIELD = "lf_hp_field";

export default function ContactForm({ defaultSubject = "", defaultName = "", defaultEmail = "" }: ContactFormProps) {
  const t = useTranslations("contact");
  const [state, formAction, isPending] = useActionState(sendContactMessage, INITIAL_STATE);

  const [values, setValues] = useState<ContactValues>({
    name: defaultName,
    email: defaultEmail,
    subject: defaultSubject,
    message: "",
  });
  const prefilled = Boolean(defaultName || defaultEmail);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ContactField, boolean>>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastState = useRef<ContactFormState>(INITIAL_STATE);

  // Set on the client only (avoids a hydration mismatch); used as a time-trap.
  useEffect(() => setStartedAt(Date.now()), []);

  // React to each new server response exactly once.
  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;

    if (state.status === "success") {
      toast.success(t("success.title"), { description: t("success.body", { name: state.name, email: state.email }) });
      setShowSuccess(true);
      // Keep the account details for a follow-up message.
      setValues({ name: defaultName, email: defaultEmail, subject: "", message: "" });
      setErrors({});
      setTouched({});
    } else if (state.status === "error") {
      toast.error(t(`errors.${state.error}`));
      if (state.fieldErrors) {
        setErrors(state.fieldErrors);
        setTouched({ name: true, email: true, subject: true, message: true });
      }
    }
  }, [state, t, defaultName, defaultEmail]);

  const update = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [field]: value }));
    // Re-validate live once the field has been visited.
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateContactField(field, normalizeContact({ [field]: value })[field]),
      }));
    }
  };

  const blur = (field: ContactField) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateContactField(field, normalizeContact(values)[field]) }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const clientErrors = validateContact(normalizeContact(values));
    if (Object.keys(clientErrors).length > 0) {
      e.preventDefault();
      setErrors(clientErrors);
      setTouched({ name: true, email: true, subject: true, message: true });
      toast.error(t("errors.fixFields"));
      const first = (["name", "email", "subject", "message"] as const).find((f) => clientErrors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
    }
  };

  if (showSuccess && state.status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-5 rounded-4xl border border-cyan-500/20 bg-cyan-500/5 px-6 py-16 text-center"
      >
        <CheckCircle2 className="h-12 w-12 text-cyan-500" aria-hidden />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">{t("success.title")}</h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          {t("success.body", { name: state.name, email: state.email })}
        </p>
        <button
          type="button"
          onClick={() => {
            setShowSuccess(false);
            setStartedAt(Date.now());
          }}
          className="cursor-pointer rounded-full border border-white/10 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:border-cyan-500 hover:text-cyan-400"
        >
          {t("success.again")}
        </button>
      </div>
    );
  }

  const fieldError = (field: ContactField) => (touched[field] ? errors[field] : undefined);

  const renderError = (field: ContactField) => {
    const error = fieldError(field);
    if (!error) return null;
    return (
      <p id={`${field}-error`} className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t(`errors.${error}`)}
      </p>
    );
  };

  const fieldProps = (field: ContactField) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: update(field),
    onBlur: blur(field),
    disabled: isPending,
    "aria-invalid": !!fieldError(field),
    "aria-describedby": fieldError(field) ? `${field}-error` : undefined,
    className: cn(inputBase, fieldError(field) ? "border-red-500/60" : "border-white/10"),
  });

  const label = (field: ContactField) => (
    <label htmlFor={field} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
      {t(`fields.${field}`)}
      <span className="text-cyan-500" aria-hidden>
        {" "}
        *
      </span>
    </label>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="relative space-y-6 rounded-4xl border border-white/5 bg-zinc-950/60 p-6 backdrop-blur-sm sm:p-8"
    >
      {/* Anti-spam: honeypot (hidden from people & assistive tech) + time-trap. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        {/* BUG FIX: this field used to be called "company", which Chrome and
            password managers autofill — every autofilled message was then
            silently rejected as spam. */}
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          defaultValue=""
        />
      </div>
      <input type="hidden" name="startedAt" value={startedAt || ""} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          {label("name")}
          <input
            {...fieldProps("name")}
            type="text"
            autoComplete="name"
            maxLength={CONTACT_LIMITS.name.max}
            placeholder={t("placeholders.name")}
            required
          />
          {renderError("name")}
        </div>
        <div className="space-y-2">
          {label("email")}
          <input
            {...fieldProps("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={CONTACT_LIMITS.email.max}
            placeholder={t("placeholders.email")}
            required
          />
          {renderError("email")}
        </div>
      </div>
      {prefilled && <p className="-mt-3 text-xs text-zinc-500">{t("prefilled")}</p>}

      <div className="space-y-2">
        {label("subject")}
        <input
          {...fieldProps("subject")}
          type="text"
          maxLength={CONTACT_LIMITS.subject.max}
          placeholder={t("placeholders.subject")}
          required
        />
        {renderError("subject")}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-4">
          {label("message")}
          <span
            className={cn(
              "text-[10px] font-bold tabular-nums",
              values.message.length > CONTACT_LIMITS.message.max ? "text-red-400" : "text-zinc-600",
            )}
            aria-live="polite"
          >
            {t("messageCounter", { count: values.message.length, max: CONTACT_LIMITS.message.max })}
          </span>
        </div>
        <textarea
          {...fieldProps("message")}
          rows={7}
          maxLength={CONTACT_LIMITS.message.max}
          placeholder={t("placeholders.message")}
          required
          className={cn(fieldProps("message").className, "min-h-40 resize-y")}
        />
        {renderError("message")}
      </div>

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-zinc-500">{t("responseTime")}</p>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isPending ? t("sending") : t("submit")}
        </button>
      </div>
    </form>
  );
}
