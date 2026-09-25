import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Bump when the legal text changes. */
const LAST_UPDATED = new Date("2026-09-25T00:00:00Z");

type Section = { title: string; body: string };

/**
 * Shared layout for /privacy and /terms. Content lives in the locale files
 * (`legal.<doc>.sections`) so both languages stay in sync.
 * NOTE: template text — have it reviewed by a lawyer before launch.
 */
export default async function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const [t, format] = await Promise.all([getTranslations("legal"), getFormatter()]);
  const sections = t.raw(`${doc}.sections`) as Section[];

  return (
    <PageShell containerClassName="max-w-3xl">
      <PageHeader
        title={t(`${doc}.title`)}
        accent={t(`${doc}.accent`)}
        meta={t("updated", { date: format.dateTime(LAST_UPDATED, { dateStyle: "long" }) })}
        description={t(`${doc}.intro`)}
      />

      <nav aria-label={t(`${doc}.title`)} className="rounded-3xl border border-white/5 bg-zinc-950 p-6">
        <ol className="grid gap-2 sm:grid-cols-2">
          {sections.map((section, index) => (
            <li key={section.title}>
              <a
                href={`#section-${index + 1}`}
                className="text-sm text-zinc-400 transition-colors hover:text-cyan-400"
              >
                {index + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28 space-y-3">
            <h2 className={type.h3}>
              <span className="text-cyan-500 not-italic">{index + 1}.</span> {section.title}
            </h2>
            <p className={type.prose}>{section.body}</p>
          </section>
        ))}
      </div>

      <p className={cn(type.body, "border-t border-white/5 pt-8")}>
        {t("contactPrompt")}{" "}
        <Link href="/contact" className="font-bold text-cyan-400 hover:underline">
          {t("contactCta")}
        </Link>
      </p>
    </PageShell>
  );
}
