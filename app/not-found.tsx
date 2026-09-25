import type { Metadata } from "next";
import Link from "next/link";
import { MoveLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/layout/container";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("notFound"), robots: { index: false } };
}

/**
 * Now a server component: the old version was a client component running a
 * glitch `setInterval` every 3s, and linked with a raw <a> (full reload).
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative flex min-h-screen items-center overflow-hidden bg-black py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <Container className="relative z-10 flex flex-col items-center space-y-8 text-center">
        <h1 className="text-7xl font-black uppercase italic leading-none tracking-tighter text-white md:text-8xl">
          {t("title")}
          <span className="text-cyan-500 not-italic">.</span>
        </h1>
        <div className="space-y-3">
          <h2 className={type.h2}>{t("heading")}</h2>
          <p className={cn(type.body, "mx-auto max-w-md")}>{t("body")}</p>
        </div>
        <Link
          href="/"
          className="group inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-xs font-black uppercase tracking-widest text-black transition-all hover:bg-cyan-500"
        >
          <MoveLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          {t("cta")}
        </Link>
      </Container>
    </main>
  );
}
