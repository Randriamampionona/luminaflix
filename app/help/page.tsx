import type { Metadata } from "next";
import Link from "next/link";
import { Monitor, Smartphone, Tv, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

type Category = { title: string; items: { q: string; a: string }[] };
type Device = { title: string; body: string };
const DEVICE_ICONS: LucideIcon[] = [Monitor, Smartphone, Tv];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("help") };
}

export default async function HelpPage() {
  const t = await getTranslations("help");
  const categories = t.raw("categories") as Category[];
  const devices = t.raw("devices") as Device[];

  return (
    <PageShell>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />

      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="faq-title" title={t("faqTitle")} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.title} className="space-y-3">
              <h3 className={type.eyebrow}>{category.title}</h3>
              {category.items.map((item) => (
                <details key={item.q} className="group rounded-2xl border border-white/5 bg-zinc-950 p-5 open:border-cyan-500/30">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-bold text-white">
                    {item.q}
                    <span aria-hidden className="text-cyan-500 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className={cn(type.prose, "mt-3")}>{item.a}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section id="devices" aria-labelledby="devices-title" className="scroll-mt-28 space-y-8">
        <SectionHeader id="devices-title" title={t("devicesTitle")} eyebrow={t("devicesBody")} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {devices.map((device, index) => {
            const Icon = DEVICE_ICONS[index] ?? Monitor;
            return (
              <article key={device.title} className="space-y-4 rounded-4xl border border-white/5 bg-zinc-950 p-8">
                <span className="inline-flex rounded-2xl bg-cyan-500/10 p-3 text-cyan-500">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className={type.h3}>{device.title}</h3>
                <p className={type.body}>{device.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col items-center gap-5 rounded-[2.5rem] border border-cyan-500/20 bg-cyan-500/5 px-6 py-12 text-center">
        <h2 className={type.h2}>{t("stillNeedHelp")}</h2>
        <p className={cn(type.body, "max-w-md")}>{t("stillNeedHelpBody")}</p>
        <Link
          href="/contact"
          className="rounded-2xl bg-cyan-500 px-8 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-400"
        >
          {t("contactCta")}
        </Link>
      </section>
    </PageShell>
  );
}
