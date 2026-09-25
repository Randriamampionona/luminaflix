import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";
import Link from "next/link";
import { Clock, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/contact-form";
import { createContactChallenge } from "@/lib/contact-captcha";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("contact") };
}

/** Name and email of the signed-in user, or empty strings for guests. */
async function getAccountDefaults() {
  try {
    const user = await currentUser();
    if (!user) return { id: null, name: "", email: "" };
    const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
    const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
    return { id: user.id, name, email };
  } catch (error) {
    unstable_rethrow(error); // let Next.js handle its own dynamic-rendering signals
    console.error("[contact] could not load the Clerk user", error);
    return { id: null, name: "", email: "" };
  }
}

/**
 * `?topic=premium` (from the Premium page) prefills the subject; signed-in
 * users get their name and email prefilled (still editable).
 */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const [{ topic }, t, account] = await Promise.all([searchParams, getTranslations("contact"), getAccountDefaults()]);
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
          {/* `key`: remount with the new defaults after signing in/out on this page. */}
          <ContactForm
            key={account.id ?? "guest"}
            initialChallenge={createContactChallenge()}
            defaultSubject={defaultSubject}
            defaultName={account.name}
            defaultEmail={account.email}
          />
        </div>
      </div>
    </PageShell>
  );
}