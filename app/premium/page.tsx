import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Check, Lock, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

const PLANS = ["free", "plus", "family"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("premium") };
}

/**
 * Premium is not live yet: no prices are invented ("price at launch"), paid
 * CTAs are disabled, and "Notify me" goes to the contact form.
 */
export default async function PremiumPage() {
  const t = await getTranslations("premium");
  const faq = t.raw("faq") as { q: string; a: string }[];

  return (
    <PageShell>
      <header className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[2.5rem] border border-white/5 bg-linear-to-b from-zinc-900 to-black px-6 py-14 text-center sm:py-20">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-2/3 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[100px]" />
        <span className="relative inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.3em] text-cyan-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" aria-hidden />
          {t("badge")}
        </span>
        <h1 className={cn(type.display, "relative")}>
          {t("title")} <span className="text-cyan-500">{t("accent")}</span>
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        <p className={cn(type.body, "relative max-w-2xl")}>{t("description")}</p>
        <Link
          href="/contact?topic=premium"
          className="relative inline-flex items-center gap-3 rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black shadow-[0_0_40px_rgba(6,182,212,0.35)] transition-all hover:bg-cyan-400 active:scale-[0.98]"
        >
          <Bell className="h-4 w-4" aria-hidden />
          {t("notify")}
        </Link>
      </header>

      <section id="plans" aria-labelledby="plans-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="plans-title" title={t("plansTitle")} eyebrow={t("plansDescription")} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isFree = plan === "free";
            const featured = plan === "plus";
            const features = t.raw(`plans.${plan}.features`) as string[];
            return (
              <article
                key={plan}
                className={cn(
                  "relative flex flex-col gap-6 rounded-4xl border p-8",
                  featured ? "border-cyan-500/50 bg-cyan-500/5 shadow-[0_0_60px_-20px_rgba(6,182,212,0.4)]" : "border-white/5 bg-zinc-950",
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-8 rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                    {t("recommended")}
                  </span>
                )}
                <div className="space-y-2">
                  <h3 className={cn(type.h3, "flex items-center gap-2")}>
                    {!isFree && <Sparkles className="h-4 w-4 text-cyan-500" aria-hidden />}
                    {t(`plans.${plan}.name`)}
                  </h3>
                  <p className={type.body}>{t(`plans.${plan}.tagline`)}</p>
                </div>
                <p className="text-3xl font-black tracking-tight text-white">
                  {isFree ? t("free") : <span className="text-xl text-zinc-400">{t("priceTba")}</span>}
                </p>
                <ul className="flex-1 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border py-3.5 text-[10px] font-black uppercase tracking-widest disabled:cursor-not-allowed",
                    isFree ? "border-white/20 text-white" : "border-white/10 text-zinc-500",
                  )}
                >
                  {!isFree && <Lock className="h-3.5 w-3.5" aria-hidden />}
                  {isFree ? t("current") : t("unavailable")}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="premium-faq" className="mx-auto w-full max-w-3xl space-y-6">
        <SectionHeader id="premium-faq" title={t("faqTitle")} />
        <div className="space-y-3">
          {faq.map((item) => (
            <details key={item.q} className="group rounded-2xl border border-white/5 bg-zinc-950 p-5 open:border-cyan-500/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-white">
                {item.q}
                <span aria-hidden className="text-cyan-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className={cn(type.prose, "mt-3")}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
