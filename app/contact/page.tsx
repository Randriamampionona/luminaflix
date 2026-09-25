import type { Metadata } from "next";
import Link from "next/link";
import { Clock, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/contact-form";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("contact") };
}

/** `?topic=premium` (from the Premium page) prefills the subject. */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const [{ topic }, t] = await Promise.all([searchParams, getTranslations("contact")]);
  const defaultSubject = topic === "premium" ? t("topics.premium") : "";

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        <aside className="space-y-8 lg:col-span-5">
          <PageHeader eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} description={t("description")} />
          <ul className="space-y-4">
            <li className="flex items-start gap-4 rounded-3xl border border-white/5 bg-zinc-950 p-5">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" aria-hidden />
              <p className={type.body}>{t("responseTime")}</p>
            </li>
            <li className="flex items-start gap-4 rounded-3xl border border-white/5 bg-zinc-950 p-5">
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" aria-hidden />
              <p className={type.body}>
                {t("helpPrompt")}{" "}
                <Link href="/help" className="font-bold text-cyan-400 hover:underline">
                  {t("helpLink")}
                </Link>
              </p>
            </li>
          </ul>
        </aside>
        <div className="lg:col-span-7">
          <ContactForm defaultSubject={defaultSubject} />
        </div>
      </div>
    </PageShell>
  );
}
