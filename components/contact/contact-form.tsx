"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getContactChallenge, sendContactMessage } from "@/action/send-contact-message.action";
import {
  CONTACT_LIMITS,
  formatCountdown,
  normalizeContact,
  validateCaptchaAnswer,
  validateContact,
  validateContactField,
  type ContactChallenge,
  type ContactErrors,
  type ContactField,
  type ContactFormState,
  type ContactValues,
} from "@/lib/contact";
import { cn } from "@/lib/utils";
import { useContactCooldown } from "@/lib/use-contact-cooldown";

const INITIAL_STATE: ContactFormState = { status: "idle" };
const ALL_TOUCHED = { name: true, email: true, subject: true, message: true, captcha: true };

const inputBase =
  "w-full rounded-2xl border bg-zinc-900/60 px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60";

interface ContactFormProps {
  /** First captcha, generated on the server with the page. */
  initialChallenge: ContactChallenge;
  defaultSubject?: string;
  /** Pre-filled from the signed-in Clerk user (see app/contact/page.tsx). */
  defaultName?: string;
  defaultEmail?: string;
}

/** Name of the hidden anti-spam field — deliberately not something browsers autofill. */
const HONEYPOT_FIELD = "lf_hp_field";

type TouchedField = ContactField | "captcha";

export default function ContactForm({
  initialChallenge,
  defaultSubject = "",
  defaultName = "",
  defaultEmail = "",
}: ContactFormProps) {
  const t = useTranslations("contact");
  const [state, formAction, isPending] = useActionState(sendContactMessage, INITIAL_STATE);
  const cooldown = useContactCooldown();
  const startCooldown = cooldown.start;

  const [values, setValues] = useState<ContactValues>({
    name: defaultName,
    email: defaultEmail,
    subject: defaultSubject,
    message: "",
  });
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [challenge, setChallenge] = useState(initialChallenge);
  const [isRefreshing, startRefresh] = useTransition();
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastState = useRef<ContactFormState>(INITIAL_STATE);
  const prefilled = Boolean(defaultName || defaultEmail);

  // Set on the client only (avoids a hydration mismatch); used as a time-trap.
  useEffect(() => setStartedAt(Date.now()), []);

  // React to each new server response exactly once.
  useEffect(() => {
    if (state === lastState.current || state.status === "idle") return;
    lastState.current = state;

    // Every response carries a fresh single-use question.
    setChallenge(state.challenge);
    setCaptchaAnswer("");

    if (state.status === "success") {
      toast.success(t("success.title"), { description: t("success.body", { name: state.name, email: state.email }) });
      startCooldown(state.cooldownSeconds);
      setShowSuccess(true);
      // Keep the account details for a follow-up message.
      setValues({ name: defaultName, email: defaultEmail, subject: "", message: "" });
      setErrors({});
      setTouched({});
      return;
    }

    if (state.error === "cooldown") {
      const seconds = state.retryAfter ?? 60;
      startCooldown(seconds);
      toast.error(t("errors.cooldown", { time: formatCountdown(seconds) }));
    } else {
      toast.error(t(`errors.${state.error}`));
    }
    if (state.fieldErrors) {
      setErrors(state.fieldErrors);
      setTouched(ALL_TOUCHED);
      if (state.fieldErrors.captcha) formRef.current?.querySelector<HTMLElement>('[name="captchaAnswer"]')?.focus();
    }
  }, [state, t, defaultName, defaultEmail, startCooldown]);

  const refreshChallenge = () => {
    startRefresh(async () => {
      try {
        setChallenge(await getContactChallenge());
        setCaptchaAnswer("");
        setErrors((prev) => ({ ...prev, captcha: undefined }));
      } catch {
        toast.error(t("errors.server"));
      }
    });
  };

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
    if (cooldown.active) {
      e.preventDefault();
      toast.error(t("errors.cooldown", { time: formatCountdown(cooldown.remaining) }));
      return;
    }
    const clientErrors = validateContact(normalizeContact(values));
    const captchaError = validateCaptchaAnswer(captchaAnswer);
    if (captchaError) clientErrors.captcha = captchaError;
    if (Object.keys(clientErrors).length > 0) {
      e.preventDefault();
      setErrors(clientErrors);
      setTouched(ALL_TOUCHED);
      toast.error(t("errors.fixFields"));
      const first = (["name", "email", "subject", "message"] as const).find((f) => clientErrors[f]);
      const name = first ?? (clientErrors.captcha ? "captchaAnswer" : undefined);
      if (name) formRef.current?.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
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
        {cooldown.active && (
          <p className="flex items-center gap-2 text-xs text-zinc-500" aria-live="polite">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {t("cooldown.notice", { time: formatCountdown(cooldown.remaining) })}
          </p>
        )}
      </div>
    );
  }

  const fieldError = (field: TouchedField) => (touched[field] ? errors[field] : undefined);

  const renderError = (field: TouchedField) => {
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

  const label = (htmlFor: string, text: string) => (
    <label htmlFor={htmlFor} className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
      {text}
      <span className="text-cyan-500" aria-hidden>
        {" "}
        *
      </span>
    </label>
  );

  const submitDisabled = isPending || cooldown.active;

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="relative space-y-6 rounded-4xl border border-white/5 bg-zinc-950/60 p-6 backdrop-blur-sm sm:p-8"
    >
      {/* Anti-spam: honeypot (hidden from people & assistive tech) + time-trap. */}
      <div aria-hidden className="absolute -left-2499.75 h-px w-px overflow-hidden">
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
      <input type="hidden" name="captchaToken" value={challenge.token} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          {label("name", t("fields.name"))}
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
          {label("email", t("fields.email"))}
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
        {label("subject", t("fields.subject"))}
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
          {label("message", t("fields.message"))}
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

      {/* Captcha */}
      <fieldset className="space-y-3 rounded-2xl border border-white/5 bg-black/30 p-4">
        <legend className="sr-only">{t("captcha.label")}</legend>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-cyan-500" aria-hidden />
          {label("captchaAnswer", t("captcha.label"))}
        </div>
        <p className="text-xs text-zinc-500">{t("captcha.hint")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-14 items-center rounded-xl border border-white/10 bg-zinc-950 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline data: URI, nothing to optimize */}
            <img
              key={challenge.token}
              src={challenge.image}
              alt={t("captcha.imageAlt")}
              className={cn("h-12 w-auto select-none", isRefreshing && "opacity-40")}
              draggable={false}
            />
          </div>
          <input
            id="captchaAnswer"
            name="captchaAnswer"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={captchaAnswer}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setCaptchaAnswer(value);
              if (touched.captcha) setErrors((prev) => ({ ...prev, captcha: validateCaptchaAnswer(value) }));
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, captcha: true }));
              setErrors((prev) => ({ ...prev, captcha: validateCaptchaAnswer(captchaAnswer) }));
            }}
            disabled={isPending}
            placeholder={t("captcha.placeholder")}
            aria-invalid={!!fieldError("captcha")}
            aria-describedby={fieldError("captcha") ? "captcha-error" : undefined}
            className={cn(
              inputBase,
              "w-28 text-center text-base font-bold tabular-nums",
              fieldError("captcha") ? "border-red-500/60" : "border-white/10",
            )}
          />
          <button
            type="button"
            onClick={refreshChallenge}
            disabled={isRefreshing || isPending}
            aria-label={t("captcha.refresh")}
            title={t("captcha.refresh")}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition-colors hover:border-cyan-500 hover:text-cyan-400 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden />
          </button>
        </div>
        {renderError("captcha")}
      </fieldset>

      {cooldown.active && (
        <p
          className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90"
          aria-live="polite"
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("cooldown.notice", { time: formatCountdown(cooldown.remaining) })}
        </p>
      )}

      <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-zinc-500">{t("responseTime")}</p>
        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:w-auto"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : cooldown.active ? (
            <Clock className="h-4 w-4" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {isPending
            ? t("sending")
            : cooldown.active
              ? t("cooldown.button", { time: formatCountdown(cooldown.remaining) })
              : t("submit")}
        </button>
      </div>
    </form>
  );
}