import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { type as typo } from "@/lib/typography";
import { cn } from "@/lib/utils";

export default async function HomeCTA() {
  const t = await getTranslations("home");

  return (
    <section className="py-16 sm:py-20">
      <Container className="flex flex-col items-center text-center">
        <div aria-hidden className="mb-8 h-1 w-24 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
        <h2 className={cn(typo.h1, "mb-6")}>{t("ctaTitle")}</h2>
        <p className={cn(typo.body, "mb-10 max-w-2xl sm:text-lg")}>{t("ctaBody")}</p>
        <Link
          href="/library"
          className="group flex items-center gap-3 rounded-full bg-cyan-500 px-12 py-4 text-sm font-black uppercase text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors duration-300 hover:bg-white"
        >
          {t("ctaButton")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </Container>
    </section>
  );
}
