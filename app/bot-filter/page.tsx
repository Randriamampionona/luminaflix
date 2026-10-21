import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import AnimatedLogo from "@/components/brand/animated-logo";
import HumanCheck from "@/components/bot-filter/human-check";
import { safeNext } from "@/lib/bot-filter";

export const metadata: Metadata = { title: "Security check", robots: { index: false, follow: false } };

type SearchParams = Promise<{ next?: string }>;

/**
 * Shown by proxy.ts to visitors outside Madagascar who haven't passed the check
 * yet. One reCAPTCHA, then straight back to the page they asked for.
 */
export default async function BotFilterPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, t] = await Promise.all([searchParams, getTranslations("botFilter")]);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const target = safeNext(next);

  return (
    <div className="dark fixed inset-0 z-300 flex items-center justify-center overflow-y-auto bg-[#020202] p-4 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl"
      />
      <main className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 p-6 text-center shadow-[0_24px_90px_-20px_rgba(6,182,212,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col items-center">
          <AnimatedLogo size={64} />
          <p className="mt-4 flex items-center gap-1.5 text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl leading-tight font-black tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("body")}</p>
        </div>

        <div className="mt-6">
          {siteKey ? (
            <HumanCheck siteKey={siteKey} next={target} />
          ) : (
            <a
              href={target}
              className="inline-flex rounded-2xl bg-cyan-500 px-6 py-3 text-xs font-black tracking-widest text-black uppercase"
            >
              {t("continue")}
            </a>
          )}
        </div>

        <p className="mt-4 text-[11px] text-zinc-500">{t("remember")}</p>
        <p className="mt-3 text-[10px] text-zinc-600">
          {t("protectedBy")}{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            {t("privacy")}
          </a>{" "}
          ·{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
            {t("terms")}
          </a>
        </p>
      </main>
    </div>
  );
}
